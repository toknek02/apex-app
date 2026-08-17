import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ?type= scopes this to one notification type (e.g. the Announcements
  // page marking just announcement.posted read on visit) instead of
  // clearing every unread notification.
  const type = new URL(req.url).searchParams.get('type')

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false, ...(type ? { type } : {}) },
    data: { read: true },
  })
  return NextResponse.json({ ok: true })
}
