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
    include: {
      director: { select: { id: true, name: true } },
      architect: { select: { id: true, name: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ leaveGroups })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_LEAVE_GROUPS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, directorId, architectId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!directorId) return NextResponse.json({ error: 'Director is required' }, { status: 400 })

  const director = await prisma.user.findUnique({ where: { id: directorId } })
  if (!director || !director.isActive) return NextResponse.json({ error: 'Director not found or inactive' }, { status: 400 })

  if (architectId) {
    const architect = await prisma.user.findUnique({ where: { id: architectId } })
    if (!architect || !architect.isActive) return NextResponse.json({ error: 'Architect not found or inactive' }, { status: 400 })
  }

  const leaveGroup = await prisma.leaveGroup.create({
    data: { name: name.trim(), directorId, architectId: architectId || null },
  })
  await logAudit({
    actor: session.user,
    action: 'leave_group.create',
    targetType: 'LeaveGroup',
    targetId: leaveGroup.id,
    targetLabel: leaveGroup.name,
    metadata: { directorId, directorName: director.name, architectId },
  })
  return NextResponse.json({ leaveGroup }, { status: 201 })
}
