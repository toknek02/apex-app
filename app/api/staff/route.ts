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

  const { name, email, password, department, designation, roleId, hourlyRate, otRate } = await req.json()
  if (!name || !email || !roleId) return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const parsedHourlyRate = parseRate(hourlyRate)
  const parsedOtRate = parseRate(otRate)
  if (!parsedHourlyRate.ok || !parsedOtRate.ok) {
    return NextResponse.json({ error: 'Rates must be non-negative numbers' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 400 })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      department: department || null,
      designation: designation || null,
      roleId,
      hourlyRate: parsedHourlyRate.rate,
      otRate: parsedOtRate.rate,
    },
    select: { id: true, name: true, department: true, designation: true, roleId: true, role: { select: { name: true } } },
  })
  await logAudit({
    actor: session.user,
    action: 'user.create',
    targetType: 'User',
    targetId: user.id,
    targetLabel: user.name,
    metadata: { email, roleId, roleName: user.role.name },
  })
  return NextResponse.json({ user }, { status: 201 })
}
