import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_VENUES')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const venues = await prisma.venue.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ venues })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_VENUES')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { description, collisionCheck } = await req.json()
  if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 })

  const venue = await prisma.venue.create({
    data: { description, collisionCheck: Boolean(collisionCheck) },
  })
  await logAudit({
    actor: session.user,
    action: 'venue.create',
    targetType: 'Venue',
    targetId: venue.id,
    targetLabel: venue.description,
  })
  return NextResponse.json({ venue }, { status: 201 })
}
