import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_ROLES')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.role.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (existing.isSystem) return NextResponse.json({ error: 'This role is protected and cannot be edited' }, { status: 403 })

  const { name, description, permissionCodes } = await req.json()

  if (Array.isArray(permissionCodes)) {
    const permissions = permissionCodes.length > 0
      ? await prisma.permission.findMany({ where: { code: { in: permissionCodes } } })
      : []
    await prisma.rolePermission.deleteMany({ where: { roleId: id } })
    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: id, permissionId: p.id })) })
    }
  }

  const role = await prisma.role.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
    },
    include: { rolePermissions: { include: { permission: true } } },
  })
  return NextResponse.json({ role })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_ROLES')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } })
  if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (existing.isSystem) return NextResponse.json({ error: 'This role is protected and cannot be deleted' }, { status: 403 })
  if (existing._count.users > 0) {
    return NextResponse.json({ error: 'Cannot delete a role that is still assigned to users' }, { status: 409 })
  }

  await prisma.role.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
