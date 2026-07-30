import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { deleteAnnouncementFile } from '@/lib/announcement-storage'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_ANNOUNCEMENTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { title, body } = await req.json()

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
    },
    include: { attachments: true, createdBy: { select: { name: true } } },
  })
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
  return NextResponse.json({ success: true })
}
