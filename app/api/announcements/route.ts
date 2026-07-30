import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { saveAnnouncementFile } from '@/lib/announcement-storage'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const announcements = await prisma.announcement.findMany({
    include: { attachments: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ announcements })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_ANNOUNCEMENTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const title = formData.get('title')
  const body = formData.get('body')
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)

  if (typeof title !== 'string' || !title.trim() || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const announcement = await prisma.announcement.create({
    data: { title, body, createdById: session.user.id },
  })

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = await saveAnnouncementFile(buffer, announcement.id, file.name)
    await prisma.announcementAttachment.create({
      data: { announcementId: announcement.id, fileName: file.name, storagePath, fileSize: file.size },
    })
  }

  const full = await prisma.announcement.findUnique({
    where: { id: announcement.id },
    include: { attachments: true, createdBy: { select: { name: true } } },
  })
  return NextResponse.json({ announcement: full }, { status: 201 })
}
