import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_LEAVE_GROUPS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const leaveGroups = await prisma.leaveGroup.findMany({
    include: { director: { select: { id: true, name: true } }, _count: { select: { members: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ leaveGroups })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_LEAVE_GROUPS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, directorId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!directorId) return NextResponse.json({ error: 'Director is required' }, { status: 400 })

  const director = await prisma.user.findUnique({ where: { id: directorId } })
  if (!director) return NextResponse.json({ error: 'Director not found' }, { status: 400 })

  const leaveGroup = await prisma.leaveGroup.create({
    data: { name: name.trim(), directorId },
  })
  await logAudit({
    actor: session.user,
    action: 'leave_group.create',
    targetType: 'LeaveGroup',
    targetId: leaveGroup.id,
    targetLabel: leaveGroup.name,
    metadata: { directorId, directorName: director.name },
  })
  return NextResponse.json({ leaveGroup }, { status: 201 })
}
