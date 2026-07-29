import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, department, designation, roleId } = await req.json()
  if (!name || !email || !roleId) return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
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
    },
    select: { id: true, name: true, department: true, designation: true, roleId: true, role: { select: { name: true } } },
  })
  return NextResponse.json({ user }, { status: 201 })
}
