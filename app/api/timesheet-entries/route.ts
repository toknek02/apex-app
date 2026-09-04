import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EVENT_TYPES, LEAVE_EVENT_TYPES } from '@/lib/timesheet-event-types'
import { STAGES } from '@/lib/logbook-stages'
import { TASKS } from '@/lib/logbook-tasks'
import { buildTimesheetWorkbook } from '@/lib/timesheet-export'
import { attributeEntryCosts } from '@/lib/entry-cost'
import { parseLocalDate } from '@/lib/date-utils'

const MAX_MINS_PER_ENTRY = 24 * 60

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const scope = searchParams.get('scope')
  const requestedUserId = searchParams.get('userId')

  const canViewTeamReports = session.user.permissions.includes('VIEW_TIMESHEET_REPORTS')
  const teamScope = scope === 'project' && canViewTeamReports

  if (teamScope && !projectId) {
    return NextResponse.json({ error: 'Project is required for team reports' }, { status: 400 })
  }

  // Viewing a specific colleague's personal timesheet (not a project-wide
  // report) requires the same permission as the project cost report — both
  // are "see someone else's logged hours" capabilities.
  const viewingOtherUser = Boolean(requestedUserId) && requestedUserId !== session.user.id && canViewTeamReports
  if (requestedUserId && requestedUserId !== session.user.id && !canViewTeamReports) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const effectiveUserId = viewingOtherUser ? requestedUserId! : session.user.id

  const [entries, members] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where: {
        ...(teamScope ? {} : { userId: effectiveUserId }),
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
      include: { project: true, ...(teamScope ? { user: { select: { id: true, name: true, department: true, basicSalary: true } } } : {}) },
      orderBy: teamScope ? [{ userId: 'asc' }, { date: 'asc' }] : { date: 'asc' },
    }),
    teamScope
      ? prisma.projectMember.findMany({
          where: { projectId: projectId! },
          include: { user: { select: { id: true, name: true, department: true } } },
        })
      : Promise.resolve([]),
  ])

  // Compute cost server-side from each entry's owner's rate, then strip the raw
  // rate figures back out before this leaves the server — rates stay visible
  // only to whoever can manage staff (see /api/staff), not every director who
  // can view a cost report. attributeEntryCosts looks beyond this
  // project-filtered list to get each user's TRUE daily OT total (a day's OT
  // can span more than one project) before splitting cost back per entry.
  let entriesWithCost = entries.map((e) => { const { user, ...rest } = e; return rest })
  if (teamScope) {
    const basicSalaryByUserId = new Map(entries.map((e) => [e.userId, e.user?.basicSalary ?? null]))
    const costs = await attributeEntryCosts(entries, basicSalaryByUserId)
    entriesWithCost = entries.map((e) => {
      const { user, ...rest } = e
      if (!user) return rest
      const { basicSalary, ...userWithoutRates } = user
      return { ...rest, user: userWithoutRates, cost: costs.get(e.id) }
    })
  }

  if (searchParams.get('format') === 'xlsx') {
    const buffer = await buildTimesheetWorkbook({
      entries: entriesWithCost,
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

  return NextResponse.json({ entries: entriesWithCost, ...(teamScope ? { members: members.map((m) => m.user) } : {}) })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, eventType, projectId, stage, task, normalMins, otMins, remarks, startMins, endMins } = body

  if (!date || !eventType || !EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 })
  }
  // Leave entries can only be created by the leave-application approval flow
  // (POST /api/leave-applications -> approve), not logged directly here —
  // otherwise leave would bypass the director approval step entirely.
  if (LEAVE_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: 'Leave must be requested via Staff → Leave, not logged directly on the timesheet' }, { status: 400 })
  }
  const hasStart = startMins !== null && startMins !== undefined && startMins !== ''
  const hasEnd = endMins !== null && endMins !== undefined && endMins !== ''
  if (hasStart !== hasEnd) {
    return NextResponse.json({ error: 'Start Time and End Time must both be set, or both left blank' }, { status: 400 })
  }
  let normalizedStartMins: number | null = null
  let normalizedEndMins: number | null = null
  if (hasStart && hasEnd) {
    normalizedStartMins = Number(startMins)
    normalizedEndMins = Number(endMins)
    const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n < 24 * 60
    if (!inRange(normalizedStartMins) || !inRange(normalizedEndMins) || normalizedEndMins <= normalizedStartMins) {
      return NextResponse.json({ error: 'End Time must be after Start Time' }, { status: 400 })
    }
  }
  const parsedDate = typeof date === 'string' ? parseLocalDate(date) : null
  if (!parsedDate) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  if (eventType === 'Project Work' && !projectId) {
    return NextResponse.json({ error: 'Project is required for Project Work' }, { status: 400 })
  }
  if (stage && !STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  }
  if (task && !TASKS.includes(task)) {
    return NextResponse.json({ error: 'Invalid task' }, { status: 400 })
  }

  const normalizedNormalMins = Math.max(0, Number(normalMins) || 0)
  let normalizedOtMins = Math.max(0, Number(otMins) || 0)
  if (normalizedNormalMins > MAX_MINS_PER_ENTRY || normalizedOtMins > MAX_MINS_PER_ENTRY) {
    return NextResponse.json({ error: 'Hours for a single entry cannot exceed 24' }, { status: 400 })
  }

  // Snapshotting the submitter's current Basic Salary now (rather than
  // reading it live at report time) means a later raise/pay cut doesn't
  // retroactively change the cost already computed for this entry.
  const submitter = await prisma.user.findUnique({ where: { id: session.user.id }, select: { otEligible: true, basicSalary: true } })

  // Never trust the client for this — only OT-eligible staff can log OT,
  // regardless of what the form submits.
  if (normalizedOtMins > 0 && !submitter?.otEligible) {
    normalizedOtMins = 0
  }

  // Anyone may log time against any active project; only the project itself is
  // validated (an unknown id would otherwise fail as a foreign-key 500).
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { status: true } })
    if (!project) {
      return NextResponse.json({ error: 'That project no longer exists' }, { status: 400 })
    }
    if (project.status !== 'Active') {
      return NextResponse.json({ error: 'That project is not active' }, { status: 400 })
    }
  }

  const entry = await prisma.timesheetEntry.create({
    data: {
      userId: session.user.id,
      date: parsedDate,
      eventType,
      projectId: projectId || null,
      stage: stage || null,
      task: task || null,
      normalMins: normalizedNormalMins,
      otMins: normalizedOtMins,
      basicSalaryAtEntry: submitter?.basicSalary ?? null,
      startMins: normalizedStartMins,
      endMins: normalizedEndMins,
      remarks: remarks || null,
    },
  })

  return NextResponse.json({ entry })
}
