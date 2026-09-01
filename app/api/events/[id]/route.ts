import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { findVenueConflicts, describeConflict } from '@/lib/venue-collision'
import { logAudit } from '@/lib/audit'
import { notifyUsers } from '@/lib/notifications'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const isOwner = existing.createdById === session.user.id
  const canEditAny = hasPermission(session.user, 'EDIT_ANY_EVENT')
  if (!isOwner && !canEditAny) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    title,
    date,
    durationMins,
    venueId,
    externalVenue,
    projectId,
    stage,
    task,
    resources,
    remarks,
    repeat,
    private: isPrivate,
    remindMe,
    attendeeIds,
  } = body

  if (!title || !date) {
    return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
  }

  const attendees: string[] = Array.isArray(attendeeIds) && attendeeIds.length > 0 ? attendeeIds : [session.user.id]
  const resolvedDurationMins = durationMins ? Number(durationMins) : 60

  if (venueId) {
    const conflicts = await findVenueConflicts(venueId, [{ date: new Date(date), durationMins: resolvedDurationMins }], id)
    if (conflicts.length > 0) {
      const first = conflicts[0]
      const viewer = { id: session.user.id, canSeeAllPrivate: canEditAny }
      return NextResponse.json(
        { error: `Venue already booked for ${describeConflict(first, viewer)}` },
        { status: 409 }
      )
    }
  }

  const prevAttendeeIds = new Set(
    (await prisma.eventAttendee.findMany({ where: { eventId: id }, select: { userId: true } })).map((a) => a.userId)
  )

  await prisma.eventAttendee.deleteMany({ where: { eventId: id } })

  const event = await prisma.event.update({
    where: { id },
    data: {
      title,
      date: new Date(date),
      durationMins: durationMins ? Number(durationMins) : null,
      venueId: venueId || null,
      externalVenue: externalVenue || null,
      projectId: projectId || null,
      stage: stage || null,
      task: task || null,
      resources: resources || null,
      remarks: remarks || null,
      repeat: Boolean(repeat),
      private: Boolean(isPrivate),
      remindMe: remindMe !== undefined ? Boolean(remindMe) : true,
      attendees: { create: attendees.map((userId) => ({ userId })) },
    },
    include: { venue: true, project: true, attendees: { include: { user: { select: { id: true, name: true, department: true } } } } },
  })

  // Only logged when acting on someone else's event via the EDIT_ANY_EVENT
  // override — editing your own event is routine, not an admin action.
  if (!isOwner) {
    await logAudit({
      actor: session.user,
      action: 'event.update_others',
      targetType: 'Event',
      targetId: id,
      targetLabel: existing.title,
      metadata: { ownerId: existing.createdById },
    })
  }

  const editor = session.user.id
  const when = event.date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  const where = event.venue ? `, ${event.venue.description}` : ''

  // Notify anyone added to the event by this edit (not already an attendee,
  // and not the person doing the editing).
  const newlyAdded = attendees.filter((uid) => uid !== editor && !prevAttendeeIds.has(uid))
  if (newlyAdded.length > 0) {
    await notifyUsers(newlyAdded, {
      type: 'event.invited',
      title: 'Added to a LogBook event',
      body: `"${title}" — ${when}${where}. Added by ${session.user.name}.`,
      link: '/logbook',
    })
  }

  // Notify existing attendees (still on the event, not the editor, and not
  // among the newly-added — they already got the fuller "added" message) if
  // the date, time, duration or venue changed.
  const rescheduled =
    existing.date.getTime() !== new Date(date).getTime() ||
    (existing.durationMins ?? null) !== (durationMins ? Number(durationMins) : null) ||
    existing.venueId !== (venueId || null) ||
    existing.externalVenue !== (externalVenue || null)
  const stillOn = attendees.filter((uid) => uid !== editor && prevAttendeeIds.has(uid))
  if (rescheduled && stillOn.length > 0) {
    await notifyUsers(stillOn, {
      type: 'event.updated',
      title: 'LogBook event updated',
      body: `"${title}" — now ${when}${where}. Updated by ${session.user.name}.`,
      link: '/logbook',
    })
  }

  return NextResponse.json({ event })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const isOwner = existing.createdById === session.user.id
  const canDelete = isOwner || hasPermission(session.user, 'EDIT_ANY_EVENT')
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const attendeeIds = (
    await prisma.eventAttendee.findMany({ where: { eventId: id }, select: { userId: true } })
  ).map((a) => a.userId)

  await prisma.event.delete({ where: { id } })

  const notifyIds = attendeeIds.filter((uid) => uid !== session.user.id)
  if (notifyIds.length > 0) {
    await notifyUsers(notifyIds, {
      type: 'event.cancelled',
      title: 'LogBook event cancelled',
      body: `"${existing.title}" scheduled for ${existing.date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} has been cancelled by ${session.user.name}.`,
      link: '/logbook',
    })
  }

  if (!isOwner) {
    await logAudit({
      actor: session.user,
      action: 'event.delete_others',
      targetType: 'Event',
      targetId: id,
      targetLabel: existing.title,
      metadata: { ownerId: existing.createdById },
    })
  }
  return NextResponse.json({ success: true })
}
