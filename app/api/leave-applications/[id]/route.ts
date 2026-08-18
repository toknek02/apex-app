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
    include: { user: { include: { leaveGroup: { select: { directorId: true, architectId: true } } } } },
  })
  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (application.status !== 'PENDING_ARCHITECT' && application.status !== 'PENDING_DIRECTOR') {
    return NextResponse.json({ error: 'This application has already been decided' }, { status: 409 })
  }
  // Never allow self-approval, even for an architect/director who's also a
  // member of their own group, and even under the MANAGE_LEAVE_GROUPS override.
  if (application.userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot approve or reject your own leave application' }, { status: 403 })
  }

  const stage = application.status === 'PENDING_ARCHITECT' ? 'ARCHITECT' : 'DIRECTOR'
  // Approval authority is whoever holds the relevant role on the applicant's
  // leave group — not a permission. Only the Administrator escape hatch
  // (MANAGE_LEAVE_GROUPS) can also act, for cases where that role is unfilled
  // or unavailable.
  const isOverride = hasPermission(session.user, 'MANAGE_LEAVE_GROUPS')
  const isAuthorizedApprover = stage === 'ARCHITECT'
    ? application.user.leaveGroup?.architectId === session.user.id
    : application.user.leaveGroup?.directorId === session.user.id
  if (!isAuthorizedApprover && !isOverride) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  // A stage-1 (architect) approval isn't final — it just advances the
  // application to the director. Everything else (either stage's rejection,
  // or the director's approval) is a terminal decision.
  const isFinal = status === 'REJECTED' || stage === 'DIRECTOR'
  const nextStatus = status === 'REJECTED' ? 'REJECTED' : stage === 'ARCHITECT' ? 'PENDING_DIRECTOR' : 'APPROVED'

  // Atomic conditional update — only succeeds if the row is still at the
  // stage we read above, so two concurrent requests (a double-click, or two
  // approvers racing) can't both go through.
  const updateResult = await prisma.leaveApplication.updateMany({
    where: { id, status: application.status },
    data: {
      status: nextStatus,
      ...(isFinal
        ? { reviewedById: session.user.id, reviewedByName: session.user.name, reviewedAt: now, reviewRemarks: reviewRemarks || null }
        : { architectApprovedById: session.user.id, architectApprovedByName: session.user.name, architectApprovedAt: now, architectRemarks: reviewRemarks || null }),
    },
  })
  if (updateResult.count === 0) {
    return NextResponse.json({ error: 'This application has already been decided' }, { status: 409 })
  }

  if (nextStatus === 'APPROVED') {
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
    action: nextStatus === 'REJECTED' ? 'leave_application.reject' : nextStatus === 'APPROVED' ? 'leave_application.approve' : 'leave_application.architect_approve',
    targetType: 'LeaveApplication',
    targetId: application.id,
    targetLabel: application.user.name,
    metadata: { leaveType: application.leaveType, startDate: application.startDate, endDate: application.endDate, reviewRemarks, stage },
  })

  // The decision has already committed above — a notification failure here
  // shouldn't turn a successful approval/rejection into an apparent error.
  try {
    const hrIds = await getHrRecipientIds(session.user.id)
    if (nextStatus === 'PENDING_DIRECTOR') {
      // Architect passed it along — the director needs to act, so their
      // notification reads as a call to action; the applicant and HR are
      // just being kept informed, so theirs reads as a status update.
      // Wrong wording here isn't cosmetic — telling the applicant an
      // application "needs your approval" would misleadingly suggest they
      // themselves are the approver.
      const directorId = application.user.leaveGroup?.directorId
      const promises: Promise<void>[] = []
      if (directorId) {
        promises.push(notifyUsers([directorId], {
          type: 'leave_application.architect_approved',
          title: `${application.user.name}'s ${application.leaveType} application needs your approval`,
          body: reviewRemarks || undefined,
          link: '/staff/leave',
        }))
      }
      promises.push(notifyUsers([application.userId, ...hrIds], {
        type: 'leave_application.architect_approved',
        title: `Your ${application.leaveType} application was approved by the architect`,
        body: 'Now awaiting director approval.',
        link: '/staff/leave',
      }))
      await Promise.all(promises)
    } else {
      await notifyUsers([application.userId, ...hrIds], {
        type: nextStatus === 'APPROVED' ? 'leave_application.approved' : 'leave_application.rejected',
        title: nextStatus === 'APPROVED'
          ? `Your ${application.leaveType} application was approved`
          : `Your ${application.leaveType} application was rejected`,
        body: reviewRemarks || undefined,
        link: '/staff/leave',
      })
    }
  } catch (err) {
    console.error('Failed to send leave decision notifications', err)
  }

  return NextResponse.json({
    application: { ...application, status: nextStatus },
  })
}
