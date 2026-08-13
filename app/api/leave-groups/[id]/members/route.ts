import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_LEAVE_GROUPS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { memberIds } = await req.json()
  if (!Array.isArray(memberIds) || !memberIds.every((m) => typeof m === 'string')) {
    return NextResponse.json({ error: 'memberIds must be an array of user IDs' }, { status: 400 })
  }

  const leaveGroup = await prisma.leaveGroup.findUnique({ where: { id }, include: { members: { select: { id: true, name: true } } } })
  if (!leaveGroup) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const currentIds = new Set(leaveGroup.members.map((m) => m.id))
  const nextIds = new Set(memberIds)
  const added = memberIds.filter((id) => !currentIds.has(id))
  const removed = leaveGroup.members.filter((m) => !nextIds.has(m.id)).map((m) => m.id)

  await prisma.$transaction([
    ...(removed.length > 0 ? [prisma.user.updateMany({ where: { id: { in: removed } }, data: { leaveGroupId: null } })] : []),
    ...(added.length > 0 ? [prisma.user.updateMany({ where: { id: { in: added } }, data: { leaveGroupId: id } })] : []),
  ])

  await logAudit({
    actor: session.user,
    action: 'leave_group.update_members',
    targetType: 'LeaveGroup',
    targetId: leaveGroup.id,
    targetLabel: leaveGroup.name,
    metadata: { added, removed },
  })

  return NextResponse.json({ ok: true })
}
