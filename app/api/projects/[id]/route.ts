import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PROJECTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { title, status, access, memberUserIds } = await req.json()

  if (Array.isArray(memberUserIds)) {
    await prisma.projectMember.deleteMany({ where: { projectId: id } })
    if (memberUserIds.length > 0) {
      await prisma.projectMember.createMany({ data: memberUserIds.map((userId: string) => ({ projectId: id, userId })) })
    }
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(access !== undefined ? { access } : {}),
    },
    include: { members: true },
  })
  return NextResponse.json({ project })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PROJECTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.project.findUnique({
    where: { id },
    include: { _count: { select: { events: true, timesheetEntries: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (existing._count.events > 0 || existing._count.timesheetEntries > 0) {
    return NextResponse.json({ error: 'Cannot delete a project with LogBook events or timesheet entries. Archive it instead.' }, { status: 409 })
  }

  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
