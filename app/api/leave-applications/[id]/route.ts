import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { notifyUsers } from '@/lib/notifications'
import { enumerateDaysInclusive } from '@/lib/date-utils'

async function getHrRecipientIds(excludeUserId?: string) {
  const hrUsers = await prisma.user.findMany({
    where: { isActive: true, role: { rolePermissions: { some: { permission: { code: 'RECEIVE_HR_LEAVE_NOTIFICATIONS' } } } } },
    select: { id: true },
  })
  return hrUsers.map((u) => u.id).filter((id) => id !== excludeUserId)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status, reviewRemarks } = await req.json()
  if (status !== 'APPROVED' && status !== 'REJECTED') {
    return NextResponse.json({ error: 'Status must be APPROVED or REJECTED' }, { status: 400 })
  }

  const application = await prisma.leaveApplication.findUnique({
    where: { id },
    include: { user: { include: { leaveGroup: { select: { directorId: true } } } } },
  })
  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (application.status !== 'PENDING') {
    return NextResponse.json({ error: 'This application has already been decided' }, { status: 409 })
  }
  // Never allow self-approval, even for a director who's also a member of
  // their own group, and even under the MANAGE_LEAVE_GROUPS override.
  if (application.userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot approve or reject your own leave application' }, { status: 403 })
  }
  // Approval authority is whoever directs the applicant's leave group — not
  // a permission. Only the Administrator escape hatch (MANAGE_LEAVE_GROUPS)
  // can also act, for cases where a group's director is unavailable.
  const isDirector = application.user.leaveGroup?.directorId === session.user.id
  const isOverride = hasPermission(session.user, 'MANAGE_LEAVE_GROUPS')
  if (!isDirector && !isOverride) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const reviewedAt = new Date()
  // Atomic conditional update — only succeeds if the row is still PENDING,
  // so two concurrent requests (a double-click, or two approvers racing)
  // can't both go through and double-create the TimesheetEntry rows below.
  const updateResult = await prisma.leaveApplication.updateMany({
    where: { id, status: 'PENDING' },
    data: {
      status,
      reviewedById: session.user.id,
      reviewedByName: session.user.name,
      reviewedAt,
      reviewRemarks: reviewRemarks || null,
    },
  })
  if (updateResult.count === 0) {
    return NextResponse.json({ error: 'This application has already been decided' }, { status: 409 })
  }

  if (status === 'APPROVED') {
    const days = enumerateDaysInclusive(application.startDate, application.endDate)
    // AM = 9am-1pm, PM = 1pm-6pm, matching the Activities Summary Gantt
    // chart's minute-since-midnight convention. FULL day leaves these null.
    const [startMins, endMins] = application.dayPortion === 'AM'
      ? [540, 780]
      : application.dayPortion === 'PM'
        ? [780, 1080]
        : [null, null]
    // Approved leave supersedes anything already logged for these dates,
    // rather than adding a second entry on top of it.
    await prisma.timesheetEntry.deleteMany({
      where: { userId: application.userId, date: { in: days } },
    })
    await prisma.timesheetEntry.createMany({
      data: days.map((date) => ({
        userId: application.userId,
        date,
        eventType: application.leaveType,
        normalMins: 0,
        otMins: 0,
        startMins,
        endMins,
        remarks: application.reason ?? 'Approved leave application',
      })),
    })
  }

  await logAudit({
    actor: session.user,
    action: status === 'APPROVED' ? 'leave_application.approve' : 'leave_application.reject',
    targetType: 'LeaveApplication',
    targetId: application.id,
    targetLabel: application.user.name,
    metadata: { leaveType: application.leaveType, startDate: application.startDate, endDate: application.endDate, reviewRemarks },
  })

  // The decision has already committed above — a notification failure here
  // shouldn't turn a successful approval/rejection into an apparent error.
  try {
    const hrIds = await getHrRecipientIds(session.user.id)
    await notifyUsers([application.userId, ...hrIds], {
      type: status === 'APPROVED' ? 'leave_application.approved' : 'leave_application.rejected',
      title: status === 'APPROVED'
        ? `Your ${application.leaveType} application was approved`
        : `Your ${application.leaveType} application was rejected`,
      body: reviewRemarks || undefined,
      link: '/staff/leave',
    })
  } catch (err) {
    console.error('Failed to send leave decision notifications', err)
  }

  return NextResponse.json({
    application: { ...application, status, reviewedById: session.user.id, reviewedByName: session.user.name, reviewedAt, reviewRemarks: reviewRemarks || null },
  })
}
