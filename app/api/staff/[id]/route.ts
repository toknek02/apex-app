import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { name, department, designation, roleId, isActive, password } = await req.json()

  if (password !== undefined && password !== '' && password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  if (roleId !== undefined) {
    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(department !== undefined ? { department: department || null } : {}),
      ...(designation !== undefined ? { designation: designation || null } : {}),
      ...(roleId !== undefined ? { roleId } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
    select: { id: true, name: true, department: true, designation: true, roleId: true, role: { select: { name: true } }, isActive: true },
  })
  return NextResponse.json({ user })
}
