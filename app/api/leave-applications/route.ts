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
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ applications })
  }

  if (scope === 'pending-approval') {
    // "Approval authority" isn't a permission — it's just whoever is set as
    // the director of the applicant's leave group.
    const directedGroups = await prisma.leaveGroup.findMany({ where: { directorId: session.user.id }, select: { id: true } })
    const groupIds = directedGroups.map((g) => g.id)
    if (groupIds.length === 0) return NextResponse.json({ applications: [] })

    const applications = await prisma.leaveApplication.findMany({
      where: { status: 'PENDING', user: { leaveGroupId: { in: groupIds } } },
      include: { user: { select: { id: true, name: true, department: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ applications })
  }

  if (scope === 'all') {
    if (!hasPermission(session.user, 'RECEIVE_HR_LEAVE_NOTIFICATIONS')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const applications = await prisma.leaveApplication.findMany({
      include: { user: { select: { id: true, name: true, department: true } } },
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

  const { leaveType, startDate, endDate, reason, dayPortion } = await req.json()

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

  const applicant = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { leaveGroup: { select: { directorId: true } } },
  })
  if (!applicant) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const application = await prisma.leaveApplication.create({
    data: {
      userId: applicant.id,
      leaveType,
      startDate: parsedStart,
      endDate: parsedEnd,
      dayPortion: portion,
      reason: reason || null,
    },
  })

  const hrIds = await getHrRecipientIds(applicant.id)
  const directorId = applicant.leaveGroup?.directorId
  const recipientIds = directorId ? [directorId, ...hrIds] : hrIds
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
    warning: directorId ? undefined : 'You are not assigned to a group yet, so only HR was notified — no director could be notified automatically.',
  }, { status: 201 })
}
