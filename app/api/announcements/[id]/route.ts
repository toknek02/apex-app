import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { deleteAnnouncementFile } from '@/lib/announcement-storage'
import { logAudit } from '@/lib/audit'
import { notifyUsers } from '@/lib/notifications'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_ANNOUNCEMENTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.announcement.findUnique({ where: { id }, include: { recipients: { select: { userId: true } } } })
  if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })

  const { title, body, recipientIds } = await req.json()

  if (recipientIds !== undefined) {
    if (!Array.isArray(recipientIds) || !recipientIds.every((v) => typeof v === 'string')) {
      return NextResponse.json({ error: 'Invalid recipients' }, { status: 400 })
    }
    if (recipientIds.length > 0) {
      const validCount = await prisma.user.count({ where: { id: { in: recipientIds }, isActive: true } })
      if (validCount !== recipientIds.length) {
        return NextResponse.json({ error: 'One or more selected recipients are invalid' }, { status: 400 })
      }
    }
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
    },
    include: { attachments: true, createdBy: { select: { name: true } } },
  })

  let newlyAddedIds: string[] = []
  if (recipientIds !== undefined) {
    const previousIds = existing.recipients.map((r) => r.userId)
    newlyAddedIds = recipientIds.filter((id: string) => !previousIds.includes(id))
    await prisma.announcementRecipient.deleteMany({ where: { announcementId: id } })
    if (recipientIds.length > 0) {
      await prisma.announcementRecipient.createMany({
        data: recipientIds.map((userId: string) => ({ announcementId: id, userId })),
      })
    }
  }

  await logAudit({
    actor: session.user,
    action: 'announcement.update',
    targetType: 'Announcement',
    targetId: announcement.id,
    targetLabel: announcement.title,
    metadata: recipientIds !== undefined ? { recipientCount: recipientIds.length } : undefined,
  })

  // Only notify people who are newly seeing this announcement for the
  // first time, not everyone on every edit.
  if (newlyAddedIds.length > 0) {
    try {
      await notifyUsers(newlyAddedIds.filter((uid) => uid !== session.user.id), {
        type: 'announcement.posted',
        title: `New announcement: ${announcement.title}`,
        body: announcement.body.length > 140 ? `${announcement.body.slice(0, 140)}…` : announcement.body,
        link: '/announcements',
      })
    } catch (err) {
      console.error('Failed to send announcement notifications', err)
    }
  }

  return NextResponse.json({ announcement })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_ANNOUNCEMENTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.announcement.findUnique({ where: { id }, include: { attachments: true } })
  if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })

  for (const attachment of existing.attachments) {
    await deleteAnnouncementFile(attachment.storagePath)
  }

  await prisma.announcement.delete({ where: { id } })
  await logAudit({
    actor: session.user,
    action: 'announcement.delete',
    targetType: 'Announcement',
    targetId: id,
    targetLabel: existing.title,
  })
  return NextResponse.json({ success: true })
}
