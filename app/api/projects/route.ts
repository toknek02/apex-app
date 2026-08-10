import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({ orderBy: { code: 'asc' } })
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PROJECTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { code, title, status, access, memberUserIds } = await req.json()
  if (!code || !title) return NextResponse.json({ error: 'Code and title are required' }, { status: 400 })

  const project = await prisma.project.create({
    data: {
      code,
      title,
      status: status || 'Active',
      access: access || 'Team',
      ...(Array.isArray(memberUserIds) && memberUserIds.length > 0
        ? { members: { create: memberUserIds.map((userId: string) => ({ userId })) } }
        : {}),
    },
  })
  await logAudit({
    actor: session.user,
    action: 'project.create',
    targetType: 'Project',
    targetId: project.id,
    targetLabel: `${project.code} — ${project.title}`,
  })
  return NextResponse.json({ project }, { status: 201 })
}
