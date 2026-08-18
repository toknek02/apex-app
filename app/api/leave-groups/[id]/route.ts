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
  const { name, directorId, architectId } = await req.json()

  if (directorId !== undefined) {
    const director = await prisma.user.findUnique({ where: { id: directorId } })
    if (!director || !director.isActive) return NextResponse.json({ error: 'Director not found or inactive' }, { status: 400 })
  }
  if (architectId) {
    const architect = await prisma.user.findUnique({ where: { id: architectId } })
    if (!architect || !architect.isActive) return NextResponse.json({ error: 'Architect not found or inactive' }, { status: 400 })
  }

  const leaveGroup = await prisma.leaveGroup.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(directorId !== undefined ? { directorId } : {}),
      ...(architectId !== undefined ? { architectId: architectId || null } : {}),
    },
  })
  await logAudit({
    actor: session.user,
    action: 'leave_group.update',
    targetType: 'LeaveGroup',
    targetId: leaveGroup.id,
    targetLabel: leaveGroup.name,
    metadata: { name, directorId, architectId },
  })
  return NextResponse.json({ leaveGroup })
}
