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
  const { name, username, email, department, designation, roleId, isActive, password, hourlyRate, otRate, leaveGroupIds } = await req.json()

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

  const parsedHourlyRate = hourlyRate !== undefined ? parseRate(hourlyRate) : undefined
  const parsedOtRate = otRate !== undefined ? parseRate(otRate) : undefined
  if ((parsedHourlyRate && !parsedHourlyRate.ok) || (parsedOtRate && !parsedOtRate.ok)) {
    return NextResponse.json({ error: 'Rates must be non-negative numbers' }, { status: 400 })
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
      ...(parsedHourlyRate ? { hourlyRate: parsedHourlyRate.rate } : {}),
      ...(parsedOtRate ? { otRate: parsedOtRate.rate } : {}),
    },
    select: { id: true, name: true, username: true, email: true, department: true, designation: true, roleId: true, role: { select: { name: true } }, isActive: true, hourlyRate: true, otRate: true, leaveGroupMemberships: { select: { leaveGroupId: true } } },
  })
  await logAudit({
    actor: session.user,
    action: password ? 'user.update_with_password_reset' : 'user.update',
    targetType: 'User',
    targetId: user.id,
    targetLabel: user.name,
    metadata: { name, username, email, department, designation, roleId, isActive, leaveGroupIds: groupIds, passwordReset: Boolean(password), ratesChanged: Boolean(parsedHourlyRate || parsedOtRate) },
  })
  return NextResponse.json({ user })
}
