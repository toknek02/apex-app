import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { announcementVisibleTo } from '@/lib/announcement-visibility'
import { getAnnouncementFilePath } from '@/lib/announcement-storage'

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, attachmentId } = await params
  // Scope the lookup by what this person is allowed to see, so an attachment
  // on an announcement they aren't a recipient of is indistinguishable from
  // one that doesn't exist.
  const announcement = await prisma.announcement.findFirst({
    where: {
      id,
      ...announcementVisibleTo(session.user, hasPermission(session.user, 'MANAGE_ANNOUNCEMENTS')),
    },
    select: { id: true },
  })
  if (!announcement) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })

  const attachment = await prisma.announcementAttachment.findFirst({
    where: { id: attachmentId, announcementId: id },
  })
  if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })

  const buffer = await fs.readFile(getAnnouncementFilePath(attachment.storagePath)).catch(() => null)
  if (!buffer) return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })

  const ext = attachment.fileName.split('.').pop()?.toLowerCase() ?? ''
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      'Content-Length': String(attachment.fileSize),
    },
  })
}
