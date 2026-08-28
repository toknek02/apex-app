import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

function parseRate(value: unknown): { ok: true; rate: number | null } | { ok: false } {
  if (value === '' || value === null || value === undefined) return { ok: true, rate: null }
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return { ok: false }
  return { ok: true, rate: n }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { name, username, email, department, designation, roleId, isActive, password, basicSalary, otEligible, leaveGroupIds } = body
  // Only HR (MANAGE_LEAVE_ENTITLEMENTS) can change entitlements — treat them
  // as not submitted at all for anyone else, so the rest of the edit (name,
  // department, role, etc.) still goes through untouched.
  const canManageEntitlements = hasPermission(session.user, 'MANAGE_LEAVE_ENTITLEMENTS')
  const annualLeaveEntitlement = canManageEntitlements ? body.annualLeaveEntitlement : undefined
  const annualLeaveBroughtForward = canManageEntitlements ? body.annualLeaveBroughtForward : undefined
  const medicalLeaveEntitlement = canManageEntitlements ? body.medicalLeaveEntitlement : undefined
  const medicalLeaveBroughtForward = canManageEntitlements ? body.medicalLeaveBroughtForward : undefined

  if (password !== undefined && password !== '' && password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  if (username !== undefined && /\s/.test(username)) {
    return NextResponse.json({ error: 'Name (login) cannot contain spaces' }, { status: 400 })
  }

  if (roleId !== undefined) {
    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 400 })
  }

  const groupIds: string[] | undefined = Array.isArray(leaveGroupIds)
    ? leaveGroupIds.filter((v): v is string => typeof v === 'string')
    : undefined
  if (groupIds && groupIds.length > 0) {
    const count = await prisma.leaveGroup.count({ where: { id: { in: groupIds } } })
    if (count !== groupIds.length) return NextResponse.json({ error: 'One or more groups not found' }, { status: 400 })
  }

  // Deactivating a group's architect/director without reassigning them first
  // would strand any application routed to that group at that stage forever
  // — nobody left who's authorized to act on it short of the admin override.
  if (isActive === false) {
    const assignedGroups = await prisma.leaveGroup.findMany({
      where: { OR: [{ architectId: id }, { directorId: id }] },
      select: { name: true, architectId: true, directorId: true },
    })
    if (assignedGroups.length > 0) {
      const names = assignedGroups.map((g) => g.name).join(', ')
      return NextResponse.json({ error: `Reassign the architect/director role on these leave groups before deactivating this user: ${names}` }, { status: 400 })
    }
  }

  if (username) {
    const existingUsername = await prisma.user.findFirst({ where: { username, NOT: { id } } })
    if (existingUsername) return NextResponse.json({ error: 'A user with this Name already exists' }, { status: 409 })
  }

  if (email) {
    const existingEmail = await prisma.user.findFirst({ where: { email, NOT: { id } } })
    if (existingEmail) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
  }

  // Never let a save leave the account with neither a Name nor an email —
  // that's the only pair of fields login can match against, so clearing
  // both would lock the user out with no way back in.
  if (username !== undefined && !username) {
    const current = await prisma.user.findUnique({ where: { id }, select: { email: true } })
    const finalEmail = email !== undefined ? email : current?.email
    if (!finalEmail) {
      return NextResponse.json({ error: 'Name (login) cannot be cleared — this user has no email either, which would lock them out' }, { status: 400 })
    }
  }

  const parsedBasicSalary = basicSalary !== undefined ? parseRate(basicSalary) : undefined
  if (parsedBasicSalary && !parsedBasicSalary.ok) {
    return NextResponse.json({ error: 'Basic Salary must be a non-negative number' }, { status: 400 })
  }

  const parsedEntitlement = annualLeaveEntitlement !== undefined ? parseRate(annualLeaveEntitlement) : undefined
  const parsedBroughtForward = annualLeaveBroughtForward !== undefined ? parseRate(annualLeaveBroughtForward) : undefined
  const parsedMedicalEntitlement = medicalLeaveEntitlement !== undefined ? parseRate(medicalLeaveEntitlement) : undefined
  const parsedMedicalBroughtForward = medicalLeaveBroughtForward !== undefined ? parseRate(medicalLeaveBroughtForward) : undefined
  if (
    (parsedEntitlement && !parsedEntitlement.ok) ||
    (parsedBroughtForward && !parsedBroughtForward.ok) ||
    (parsedMedicalEntitlement && !parsedMedicalEntitlement.ok) ||
    (parsedMedicalBroughtForward && !parsedMedicalBroughtForward.ok)
  ) {
    return NextResponse.json({ error: 'Leave Entitlement and Brought Forward must be non-negative numbers' }, { status: 400 })
  }

  // Every pay formula — normal hours included — derives from Basic Salary.
  // Without it, OT-eligible staff would silently cost RM0.00 everywhere.
  // Only worth the extra lookup when either field is actually changing.
  if (otEligible !== undefined || basicSalary !== undefined) {
    const current = await prisma.user.findUnique({ where: { id }, select: { otEligible: true, basicSalary: true } })
    const finalOtEligible = otEligible !== undefined ? Boolean(otEligible) : current?.otEligible ?? false
    const finalBasicSalary = parsedBasicSalary?.ok ? parsedBasicSalary.rate : current?.basicSalary ?? null
    if (finalOtEligible && !finalBasicSalary) {
      return NextResponse.json({ error: 'Basic Salary is required for staff eligible for OT' }, { status: 400 })
    }
  }

  if (groupIds !== undefined) {
    // Replace the full membership set rather than diffing — simpler, and
    // this is a small list so the extra writes are negligible.
    await prisma.leaveGroupMember.deleteMany({ where: { userId: id } })
    if (groupIds.length > 0) {
      await prisma.leaveGroupMember.createMany({ data: groupIds.map((leaveGroupId) => ({ userId: id, leaveGroupId })) })
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(username !== undefined ? { username: username || null } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(department !== undefined ? { department: department || null } : {}),
      ...(designation !== undefined ? { designation: designation || null } : {}),
      ...(roleId !== undefined ? { roleId } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      ...(parsedBasicSalary ? { basicSalary: parsedBasicSalary.rate } : {}),
      ...(otEligible !== undefined ? { otEligible: Boolean(otEligible) } : {}),
      ...(parsedEntitlement ? { annualLeaveEntitlement: parsedEntitlement.rate } : {}),
      ...(parsedBroughtForward ? { annualLeaveBroughtForward: parsedBroughtForward.rate ?? 0 } : {}),
      ...(parsedMedicalEntitlement ? { medicalLeaveEntitlement: parsedMedicalEntitlement.rate } : {}),
      ...(parsedMedicalBroughtForward ? { medicalLeaveBroughtForward: parsedMedicalBroughtForward.rate ?? 0 } : {}),
    },
    select: { id: true, name: true, username: true, email: true, department: true, designation: true, roleId: true, role: { select: { name: true } }, isActive: true, basicSalary: true, otEligible: true, annualLeaveEntitlement: true, annualLeaveBroughtForward: true, medicalLeaveEntitlement: true, medicalLeaveBroughtForward: true, leaveGroupMemberships: { select: { leaveGroupId: true } } },
  })
  await logAudit({
    actor: session.user,
    action: password ? 'user.update_with_password_reset' : 'user.update',
    targetType: 'User',
    targetId: user.id,
    targetLabel: user.name,
    metadata: { name, username, email, department, designation, roleId, isActive, leaveGroupIds: groupIds, passwordReset: Boolean(password), salaryChanged: Boolean(parsedBasicSalary), otEligible, entitlementsChanged: Boolean(parsedEntitlement || parsedBroughtForward || parsedMedicalEntitlement || parsedMedicalBroughtForward) },
  })
  return NextResponse.json({ user })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          signInRecords: true,
          timesheetEntries: true,
          leaveApplications: true,
          reviewedLeaveApplications: true,
          architectApprovedLeaveApplications: true,
          eventAttendees: true,
          createdEvents: true,
          announcements: true,
          announcementReceipts: true,
          notifications: true,
          directedLeaveGroups: true,
          architectedLeaveGroups: true,
        },
      },
    },
  })
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (existing.isActive) {
    return NextResponse.json({ error: 'Only inactive users can be deleted — set their Status to Inactive first.' }, { status: 409 })
  }

  const hasActivity = Object.values(existing._count).some((c) => c > 0)
  if (hasActivity) {
    return NextResponse.json(
      { error: 'Cannot delete a user with existing activity (timesheets, leave, sign-ins, etc.) — their history would be lost.' },
      { status: 409 }
    )
  }

  await prisma.user.delete({ where: { id } })
  await logAudit({
    actor: session.user,
    action: 'user.delete',
    targetType: 'User',
    targetId: existing.id,
    targetLabel: existing.name,
  })
  return NextResponse.json({ ok: true })
}
