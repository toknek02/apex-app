import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NOTIFICATION_TYPES } from '@/lib/notification-types'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, muted } = await req.json()
  if (typeof type !== 'string' || !NOTIFICATION_TYPES.some((t) => t.type === type) || typeof muted !== 'boolean') {
    return NextResponse.json({ error: 'Invalid type or muted value' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { mutedNotificationTypes: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const next = muted
    ? [...new Set([...user.mutedNotificationTypes, type])]
    : user.mutedNotificationTypes.filter((t) => t !== type)

  await prisma.user.update({ where: { id: session.user.id }, data: { mutedNotificationTypes: next } })

  return NextResponse.json({ mutedNotificationTypes: next })
}
