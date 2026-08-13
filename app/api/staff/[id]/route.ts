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
  const { name, username, email, department, designation, roleId, isActive, password, hourlyRate, otRate, leaveGroupId } = await req.json()

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

  if (leaveGroupId) {
    const leaveGroup = await prisma.leaveGroup.findUnique({ where: { id: leaveGroupId } })
    if (!leaveGroup) return NextResponse.json({ error: 'Group not found' }, { status: 400 })
  }

  if (username) {
    const existingUsername = await prisma.user.findFirst({ where: { username, NOT: { id } } })
    if (existingUsername) return NextResponse.json({ error: 'A user with this Name already exists' }, { status: 409 })
  }

  if (email) {
    const existingEmail = await prisma.user.findFirst({ where: { email, NOT: { id } } })
    if (existingEmail) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
  }

  const parsedHourlyRate = hourlyRate !== undefined ? parseRate(hourlyRate) : undefined
  const parsedOtRate = otRate !== undefined ? parseRate(otRate) : undefined
  if ((parsedHourlyRate && !parsedHourlyRate.ok) || (parsedOtRate && !parsedOtRate.ok)) {
    return NextResponse.json({ error: 'Rates must be non-negative numbers' }, { status: 400 })
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
      ...(leaveGroupId !== undefined ? { leaveGroupId: leaveGroupId || null } : {}),
    },
    select: { id: true, name: true, username: true, email: true, department: true, designation: true, roleId: true, role: { select: { name: true } }, isActive: true, hourlyRate: true, otRate: true, leaveGroupId: true },
  })
  await logAudit({
    actor: session.user,
    action: password ? 'user.update_with_password_reset' : 'user.update',
    targetType: 'User',
    targetId: user.id,
    targetLabel: user.name,
    metadata: { name, username, email, department, designation, roleId, isActive, leaveGroupId, passwordReset: Boolean(password), ratesChanged: Boolean(parsedHourlyRate || parsedOtRate) },
  })
  return NextResponse.json({ user })
}
