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

  const { code, shortName, title, status, access, offices, memberUserIds } = await req.json()
  if (!code || !shortName || !title) {
    return NextResponse.json({ error: 'Code, short name, and title are required' }, { status: 400 })
  }

  const trimmedCode = String(code).trim()

  // Project.code is unique, so without this the insert throws and the caller
  // just sees a 500. Matched case-insensitively (as the bulk upload does) so
  // "kl2432" can't slip in alongside an existing "KL2432".
  const existing = await prisma.project.findFirst({
    where: { code: { equals: trimmedCode, mode: 'insensitive' } },
    select: { code: true },
  })
  if (existing) {
    return NextResponse.json({ error: `Project code ${existing.code} already exists` }, { status: 409 })
  }

  // A bad user id would otherwise fail as a foreign-key error, again as a 500.
  const members: string[] = Array.isArray(memberUserIds) ? memberUserIds.filter((v): v is string => typeof v === 'string') : []
  if (members.length > 0) {
    const found = await prisma.user.count({ where: { id: { in: members } } })
    if (found !== members.length) {
      return NextResponse.json({ error: 'One or more selected staff no longer exist' }, { status: 400 })
    }
  }

  const project = await prisma.project.create({
    data: {
      code: trimmedCode,
      shortName,
      title,
      status: status || 'Active',
      access: access || 'Team',
      offices: Array.isArray(offices) ? offices : [],
      ...(members.length > 0 ? { members: { create: members.map((userId) => ({ userId })) } } : {}),
    },
  })
  await logAudit({
    actor: session.user,
    action: 'project.create',
    targetType: 'Project',
    targetId: project.id,
    targetLabel: `${project.code} — ${project.shortName}`,
  })
  return NextResponse.json({ project }, { status: 201 })
}
