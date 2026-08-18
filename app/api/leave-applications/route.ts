import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { notifyUsers } from '@/lib/notifications'
import { LEAVE_EVENT_TYPES, HALF_DAY_ELIGIBLE_LEAVE_TYPES } from '@/lib/timesheet-event-types'
import { parseLocalDate } from '@/lib/date-utils'

async function getHrRecipientIds(excludeUserId?: string) {
  const hrUsers = await prisma.user.findMany({
    where: { isActive: true, role: { rolePermissions: { some: { permission: { code: 'RECEIVE_HR_LEAVE_NOTIFICATIONS' } } } } },
    select: { id: true },
  })
  return hrUsers.map((u) => u.id).filter((id) => id !== excludeUserId)
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') ?? 'mine'

  if (scope === 'mine') {
    const applications = await prisma.leaveApplication.findMany({
      where: { userId: session.user.id },
      include: { project: { select: { id: true, code: true, shortName: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ applications })
  }

  if (scope === 'pending-approval') {
    // "Approval authority" isn't a permission — it's whoever is set as a
    // group's architect (stage 1) or director (stage 2). The same person
    // can hold either role for different groups, so both are checked.
    const [architectedGroups, directedGroups] = await Promise.all([
      prisma.leaveGroup.findMany({ where: { architectId: session.user.id }, select: { id: true } }),
      prisma.leaveGroup.findMany({ where: { directorId: session.user.id }, select: { id: true } }),
    ])
    const architectGroupIds = architectedGroups.map((g) => g.id)
    const directorGroupIds = directedGroups.map((g) => g.id)
    if (architectGroupIds.length === 0 && directorGroupIds.length === 0) return NextResponse.json({ applications: [] })

    const applications = await prisma.leaveApplication.findMany({
      where: {
        OR: [
          ...(architectGroupIds.length > 0 ? [{ status: 'PENDING_ARCHITECT', leaveGroupId: { in: architectGroupIds } }] : []),
          ...(directorGroupIds.length > 0 ? [{ status: 'PENDING_DIRECTOR', leaveGroupId: { in: directorGroupIds } }] : []),
        ],
      },
      include: { user: { select: { id: true, name: true, department: true } }, project: { select: { id: true, code: true, shortName: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ applications })
  }

  if (scope === 'all') {
    if (!hasPermission(session.user, 'RECEIVE_HR_LEAVE_NOTIFICATIONS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const applications = await prisma.leaveApplication.findMany({
      include: { user: { select: { id: true, name: true, department: true } }, project: { select: { id: true, code: true, shortName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json({ applications })
  }

  return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leaveType, startDate, endDate, reason, dayPortion, projectId, leaveGroupId } = await req.json()

  if (!leaveType || !LEAVE_EVENT_TYPES.includes(leaveType)) {
    return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 })
  }
  const parsedStart = typeof startDate === 'string' ? parseLocalDate(startDate) : null
  const parsedEnd = typeof endDate === 'string' ? parseLocalDate(endDate) : null
  if (!parsedStart || !parsedEnd) return NextResponse.json({ error: 'Invalid start or end date' }, { status: 400 })
  if (parsedEnd.getTime() < parsedStart.getTime()) {
    return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 })
  }

  const portion = dayPortion === 'AM' || dayPortion === 'PM' ? dayPortion : 'FULL'
  if (portion !== 'FULL') {
    if (!HALF_DAY_ELIGIBLE_LEAVE_TYPES.includes(leaveType)) {
      return NextResponse.json({ error: 'Half day is not available for this leave type' }, { status: 400 })
    }
    if (parsedStart.getTime() !== parsedEnd.getTime()) {
      return NextResponse.json({ error: 'Half day applications must be a single day' }, { status: 400 })
    }
  }

  let validProjectId: string | null = null
  if (typeof projectId === 'string' && projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 400 })
    validProjectId = project.id
  }

  const applicant = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { leaveGroupMemberships: { include: { leaveGroup: { select: { id: true, directorId: true, architectId: true } } } } },
  })
  if (!applicant) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // An applicant in more than one group picks which one to route through;
  // with exactly one it's implied. Whichever it is, it must be a group
  // they're actually a member of — not just any group id someone could pass
  // in to route around the intended approver.
  const memberships = applicant.leaveGroupMemberships
  let chosenGroup: (typeof memberships)[number]['leaveGroup'] | null = null
  if (typeof leaveGroupId === 'string' && leaveGroupId) {
    const membership = memberships.find((m) => m.leaveGroupId === leaveGroupId)
    if (!membership) return NextResponse.json({ error: 'You are not a member of that group' }, { status: 400 })
    chosenGroup = membership.leaveGroup
  } else if (memberships.length === 1) {
    chosenGroup = memberships[0].leaveGroup
  } else if (memberships.length > 1) {
    return NextResponse.json({ error: 'You belong to more than one group — pick which one should review this application' }, { status: 400 })
  }

  // Applications from a group with an architect start there; everyone else
  // (no architect assigned, or no group at all) goes straight to the
  // director stage, matching the app's original single-stage behavior.
  const architectId = chosenGroup?.architectId
  const directorId = chosenGroup?.directorId
  const initialStatus = architectId ? 'PENDING_ARCHITECT' : 'PENDING_DIRECTOR'

  const application = await prisma.leaveApplication.create({
    data: {
      userId: applicant.id,
      leaveType,
      startDate: parsedStart,
      endDate: parsedEnd,
      dayPortion: portion,
      reason: reason || null,
      projectId: validProjectId,
      leaveGroupId: chosenGroup?.id ?? null,
      status: initialStatus,
    },
  })

  const hrIds = await getHrRecipientIds(applicant.id)
  const firstApproverId = architectId ?? directorId
  const recipientIds = firstApproverId ? [firstApproverId, ...hrIds] : hrIds
  const dateRange = parsedStart.getTime() === parsedEnd.getTime()
    ? parsedStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : `${parsedStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${parsedEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`

  await notifyUsers(recipientIds, {
    type: 'leave_application.submitted',
    title: `${applicant.name} applied for ${leaveType}`,
    body: dateRange,
    link: '/staff/leave',
  })

  return NextResponse.json({
    application,
    warning: firstApproverId ? undefined : 'You are not assigned to a group yet, so only HR was notified — no approver could be notified automatically.',
  }, { status: 201 })
}
