import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { description, collisionCheck } = await req.json()

  const venue = await prisma.venue.update({
    where: { id },
    data: {
      ...(description !== undefined ? { description } : {}),
      ...(collisionCheck !== undefined ? { collisionCheck: Boolean(collisionCheck) } : {}),
    },
  })
  return NextResponse.json({ venue })
}
