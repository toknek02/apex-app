import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } }, _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ roles })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_ROLES')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, permissionCodes } = await req.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
  }

  const existing = await prisma.role.findUnique({ where: { name } })
  if (existing) return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 })

  const codes: string[] = Array.isArray(permissionCodes) ? permissionCodes : []
  const permissions = codes.length > 0 ? await prisma.permission.findMany({ where: { code: { in: codes } } }) : []

  const role = await prisma.role.create({
    data: {
      name,
      description: description || null,
      rolePermissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
    },
    include: { rolePermissions: { include: { permission: true } } },
  })
  await logAudit({
    actor: session.user,
    action: 'role.create',
    targetType: 'Role',
    targetId: role.id,
    targetLabel: role.name,
    metadata: { permissionCodes: codes },
  })
  return NextResponse.json({ role }, { status: 201 })
}
