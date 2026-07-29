import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { name, department, designation, role, isActive, password } = await req.json()

  if (password !== undefined && password !== '' && password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(department !== undefined ? { department: department || null } : {}),
      ...(designation !== undefined ? { designation: designation || null } : {}),
      ...(role !== undefined ? { role: role === 'ADMIN' ? 'ADMIN' : 'STAFF' } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
    select: { id: true, name: true, department: true, designation: true, role: true, isActive: true },
  })
  return NextResponse.json({ user })
}
