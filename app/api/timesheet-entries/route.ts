import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EVENT_TYPES } from '@/lib/timesheet-event-types'
import { buildTimesheetWorkbook } from '@/lib/timesheet-export'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const scope = searchParams.get('scope')

  const canViewTeamReports = session.user.permissions.includes('VIEW_TIMESHEET_REPORTS')
  const teamScope = scope === 'project' && canViewTeamReports

  if (teamScope && !projectId) {
    return NextResponse.json({ error: 'Project is required for team reports' }, { status: 400 })
  }

  const [entries, members] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where: {
        ...(teamScope ? {} : { userId: session.user.id }),
        ...(projectId ? { projectId } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { project: true, ...(teamScope ? { user: { select: { id: true, name: true, department: true } } } : {}) },
      orderBy: teamScope ? [{ userId: 'asc' }, { date: 'asc' }] : { date: 'asc' },
    }),
    teamScope
      ? prisma.projectMember.findMany({
          where: { projectId: projectId! },
          include: { user: { select: { id: true, name: true, department: true } } },
        })
      : Promise.resolve([]),
  ])

  if (searchParams.get('format') === 'xlsx') {
    const buffer = await buildTimesheetWorkbook({
      entries,
      members: members.map((m) => m.user),
      teamScope,
    })
    const filename = teamScope ? 'team-timesheet-report.xlsx' : 'my-timesheet-entries.xlsx'
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ entries, ...(teamScope ? { members: members.map((m) => m.user) } : {}) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, eventType, projectId, stage, task, normalMins, otMins, remarks } = body

  if (!date || !eventType || !EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 })
  }
  if (eventType === 'Project Work' && !projectId) {
    return NextResponse.json({ error: 'Project is required for Project Work' }, { status: 400 })
  }

  if (projectId) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.user.id } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'You are not assigned to this project' }, { status: 403 })
    }
  }

  const entry = await prisma.timesheetEntry.create({
    data: {
      userId: session.user.id,
      date: new Date(date),
      eventType,
      projectId: projectId || null,
      stage: stage || null,
      task: task || null,
      normalMins: Math.max(0, Number(normalMins) || 0),
      otMins: Math.max(0, Number(otMins) || 0),
      remarks: remarks || null,
    },
  })

  return NextResponse.json({ entry })
}
