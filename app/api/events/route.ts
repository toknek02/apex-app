import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
      ...(keyword ? { title: { contains: keyword } } : {}),
      ...(staffId || mine === 'true'
        ? { attendees: { some: { userId: staffId ?? session.user.id } } }
        : {}),
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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const event = await prisma.event.create({
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
      createdById: session.user.id,
      attendees: { create: attendees.map((userId) => ({ userId })) },
    },
    include: { venue: true, project: true, attendees: { include: { user: true } } },
  })

  return NextResponse.json({ event }, { status: 201 })
}
