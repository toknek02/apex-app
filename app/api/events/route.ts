import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { findVenueConflicts, findAttendeeConflicts, describeConflict } from '@/lib/event-conflicts'
import { notifyUsers } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const staffId = searchParams.get('staffId')
  const venueId = searchParams.get('venueId')
  const projectId = searchParams.get('projectId')
  const keyword = searchParams.get('keyword')
  const mine = searchParams.get('mine')

  const canSeeAllPrivate = hasPermission(session.user, 'EDIT_ANY_EVENT')

  const events = await prisma.event.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(venueId ? { venueId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(keyword ? { title: { contains: keyword, mode: 'insensitive' } } : {}),
      ...(staffId || mine === 'true'
        ? { attendees: { some: { userId: staffId ?? session.user.id } } }
        : {}),
      ...(canSeeAllPrivate
        ? {}
        : { OR: [{ private: false }, { createdById: session.user.id }, { attendees: { some: { userId: session.user.id } } }] }),
    },
    include: {
      venue: true,
      project: true,
      attendees: { include: { user: { select: { id: true, name: true, department: true } } } },
      createdBy: { select: { id: true, name: true, department: true } },
    },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json({ events })
}

const MAX_REPEAT_OCCURRENCES = 365

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title,
    date,
    dates,
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

  const occurrenceDates: string[] = Array.isArray(dates) && dates.length > 0 ? dates : [date]
  if (occurrenceDates.length > MAX_REPEAT_OCCURRENCES) {
    return NextResponse.json({ error: `Cannot create more than ${MAX_REPEAT_OCCURRENCES} repeated events at once` }, { status: 400 })
  }

  const attendees: string[] = Array.isArray(attendeeIds) && attendeeIds.length > 0 ? attendeeIds : [session.user.id]
  const resolvedDurationMins = durationMins ? Number(durationMins) : 60

  const occurrences = occurrenceDates.map((d) => ({ date: new Date(d), durationMins: resolvedDurationMins }))
  const viewer = { id: session.user.id, canSeeAllPrivate: hasPermission(session.user, 'EDIT_ANY_EVENT') }
  const more = (n: number) => (n > 1 ? ` (+${n - 1} more clash${n - 1 === 1 ? '' : 'es'})` : '')

  if (venueId) {
    const conflicts = await findVenueConflicts(venueId, occurrences)
    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: `Venue already booked for ${describeConflict(conflicts[0], viewer)}${more(conflicts.length)}` },
        { status: 409 }
      )
    }
  }

  const staffConflicts = await findAttendeeConflicts(attendees, occurrences)
  if (staffConflicts.length > 0) {
    const first = staffConflicts[0]
    return NextResponse.json(
      { error: `${first.staffName} is already booked for ${describeConflict(first, viewer)}${more(staffConflicts.length)}` },
      { status: 409 }
    )
  }

  const baseData = {
    title,
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
    createdById: session.user.id,
  }

  const events = await prisma.$transaction(
    occurrenceDates.map((occurrenceDate) =>
      prisma.event.create({
        data: {
          ...baseData,
          date: new Date(occurrenceDate),
          attendees: { create: attendees.map((userId) => ({ userId })) },
        },
        include: { venue: true, project: true, attendees: { include: { user: { select: { id: true, name: true, department: true } } } } },
      })
    )
  )

  // Tell attendees (other than whoever created it) they've been added. One
  // notification per person even for a repeated event, not one per occurrence.
  const inviteeIds = attendees.filter((uid) => uid !== session.user.id)
  if (inviteeIds.length > 0) {
    const first = events[0]
    const when =
      events.length > 1
        ? `${events.length} dates from ${first.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : first.date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    await notifyUsers(inviteeIds, {
      type: 'event.invited',
      title: 'Added to a LogBook event',
      body: `"${title}" — ${when}${first.venue ? `, ${first.venue.description}` : ''}. Added by ${session.user.name}.`,
      link: '/logbook',
    })
  }

  return NextResponse.json({ event: events[0], events, count: events.length }, { status: 201 })
}
