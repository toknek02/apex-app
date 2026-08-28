import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staff = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, department: true, designation: true, roleId: true, role: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ staff })
}

function parseRate(value: unknown): { ok: true; rate: number | null } | { ok: false } {
  if (value === '' || value === null || value === undefined) return { ok: true, rate: null }
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return { ok: false }
  return { ok: true, rate: n }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, username, email, password, department, designation, roleId, basicSalary, otEligible, annualLeaveEntitlement, annualLeaveBroughtForward, medicalLeaveEntitlement, medicalLeaveBroughtForward, leaveGroupIds } = await req.json()
  if (!name || !username || !roleId) return NextResponse.json({ error: 'Full Name, Name, and role are required' }, { status: 400 })
  if (/\s/.test(username)) return NextResponse.json({ error: 'Name (login) cannot contain spaces' }, { status: 400 })
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const parsedBasicSalary = parseRate(basicSalary)
  if (!parsedBasicSalary.ok) {
    return NextResponse.json({ error: 'Basic Salary must be a non-negative number' }, { status: 400 })
  }
  // Every pay formula — normal hours included — derives from Basic Salary.
  // Without it, OT-eligible staff would silently cost RM0.00 everywhere.
  if (otEligible && !parsedBasicSalary.rate) {
    return NextResponse.json({ error: 'Basic Salary is required for staff eligible for OT' }, { status: 400 })
  }

  // Only HR (MANAGE_LEAVE_ENTITLEMENTS) can set entitlements — anyone else's
  // submitted values are silently ignored rather than rejecting the whole
  // creation, since they're still allowed to create the user itself.
  const canManageEntitlements = hasPermission(session.user, 'MANAGE_LEAVE_ENTITLEMENTS')
  const parsedEntitlement = canManageEntitlements ? parseRate(annualLeaveEntitlement) : { ok: true as const, rate: null }
  const parsedBroughtForward = canManageEntitlements ? parseRate(annualLeaveBroughtForward) : { ok: true as const, rate: null }
  const parsedMedicalEntitlement = canManageEntitlements ? parseRate(medicalLeaveEntitlement) : { ok: true as const, rate: null }
  const parsedMedicalBroughtForward = canManageEntitlements ? parseRate(medicalLeaveBroughtForward) : { ok: true as const, rate: null }
  if (!parsedEntitlement.ok || !parsedBroughtForward.ok || !parsedMedicalEntitlement.ok || !parsedMedicalBroughtForward.ok) {
    return NextResponse.json({ error: 'Leave Entitlement and Brought Forward must be non-negative numbers' }, { status: 400 })
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) return NextResponse.json({ error: 'A user with this Name already exists' }, { status: 409 })

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 400 })

  const groupIds: string[] = Array.isArray(leaveGroupIds) ? leaveGroupIds.filter((v): v is string => typeof v === 'string') : []
  if (groupIds.length > 0) {
    const count = await prisma.leaveGroup.count({ where: { id: { in: groupIds } } })
    if (count !== groupIds.length) return NextResponse.json({ error: 'One or more groups not found' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name,
      username,
      email: email || null,
      passwordHash,
      department: department || null,
      designation: designation || null,
      roleId,
      basicSalary: parsedBasicSalary.rate,
      otEligible: Boolean(otEligible),
      annualLeaveEntitlement: parsedEntitlement.rate,
      annualLeaveBroughtForward: parsedBroughtForward.rate ?? 0,
      medicalLeaveEntitlement: parsedMedicalEntitlement.rate,
      medicalLeaveBroughtForward: parsedMedicalBroughtForward.rate ?? 0,
      leaveGroupMemberships: { create: groupIds.map((leaveGroupId) => ({ leaveGroupId })) },
    },
    select: { id: true, name: true, username: true, department: true, designation: true, roleId: true, role: { select: { name: true } }, leaveGroupMemberships: { select: { leaveGroupId: true } } },
  })
  await logAudit({
    actor: session.user,
    action: 'user.create',
    targetType: 'User',
    targetId: user.id,
    targetLabel: user.name,
    metadata: { username, email, roleId, roleName: user.role.name },
  })
  return NextResponse.json({ user }, { status: 201 })
}
