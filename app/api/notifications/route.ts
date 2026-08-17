import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [notifications, unreadCount, unreadByTypeRows] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
    // Per-type unread counts (e.g. for the Announcements nav badge) —
    // computed independently of the 20-item page above, so it stays
    // accurate even when there are more than 20 unread notifications.
    prisma.notification.groupBy({
      by: ['type'],
      where: { userId: session.user.id, read: false },
      _count: { type: true },
    }),
  ])
  const unreadByType = Object.fromEntries(unreadByTypeRows.map((r) => [r.type, r._count.type]))

  return NextResponse.json({ notifications, unreadCount, unreadByType })
}
