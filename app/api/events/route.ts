import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { findVenueConflicts } from '@/lib/venue-collision'

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
      attendees: { include: { user: true } },
      createdBy: true,
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

  if (venueId) {
    const conflicts = await findVenueConflicts(
      venueId,
      occurrenceDates.map((d) => ({ date: new Date(d), durationMins: resolvedDurationMins }))
    )
    if (conflicts.length > 0) {
      const first = conflicts[0]
      return NextResponse.json(
        {
          error: `Venue already booked for "${first.conflictingEvent.title}" on ${first.conflictingEvent.date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}${conflicts.length > 1 ? ` (+${conflicts.length - 1} more conflict${conflicts.length - 1 === 1 ? '' : 's'})` : ''}`,
        },
        { status: 409 }
      )
    }
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
        include: { venue: true, project: true, attendees: { include: { user: true } } },
      })
    )
  )

  return NextResponse.json({ event: events[0], events, count: events.length }, { status: 201 })
}
