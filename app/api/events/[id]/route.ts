import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { findVenueConflicts } from '@/lib/venue-collision'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const canEdit = existing.createdById === session.user.id || hasPermission(session.user, 'EDIT_ANY_EVENT')
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
      return NextResponse.json(
        { error: `Venue already booked for "${first.conflictingEvent.title}" on ${first.conflictingEvent.date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` },
        { status: 409 }
      )
    }
  }

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
    include: { venue: true, project: true, attendees: { include: { user: true } } },
  })

  return NextResponse.json({ event })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const canDelete = existing.createdById === session.user.id || hasPermission(session.user, 'EDIT_ANY_EVENT')
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.event.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
