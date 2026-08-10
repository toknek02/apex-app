import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_VENUES')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { description, collisionCheck } = await req.json()

  const venue = await prisma.venue.update({
    where: { id },
    data: {
      ...(description !== undefined ? { description } : {}),
      ...(collisionCheck !== undefined ? { collisionCheck: Boolean(collisionCheck) } : {}),
    },
  })
  await logAudit({
    actor: session.user,
    action: 'venue.update',
    targetType: 'Venue',
    targetId: venue.id,
    targetLabel: venue.description,
    metadata: { description, collisionCheck },
  })
  return NextResponse.json({ venue })
}
