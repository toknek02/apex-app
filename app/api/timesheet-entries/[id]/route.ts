import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { isEntryLocked, TIMESHEET_EDIT_WINDOW_DAYS } from '@/lib/timesheet-lock'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.timesheetEntry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const isOwner = existing.userId === session.user.id
  const canManageEntries = hasPermission(session.user, 'MANAGE_TIMESHEET_ENTRIES')
  if (!isOwner && !canManageEntries) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (isOwner && !canManageEntries && isEntryLocked(existing.date)) {
    return NextResponse.json(
      { error: `This entry is more than ${TIMESHEET_EDIT_WINDOW_DAYS} days old and can no longer be self-deleted. Contact an administrator.` },
      { status: 403 }
    )
  }

  await prisma.timesheetEntry.delete({ where: { id } })
  // Always logged, including self-deletes — this data feeds cost reports
  // directors may have already relied on, so a self-delete of a past entry
  // needs a trail too, not just deletions made on someone else's behalf.
  await logAudit({
    actor: session.user,
    action: isOwner ? 'timesheet_entry.delete_own' : 'timesheet_entry.delete',
    targetType: 'TimesheetEntry',
    targetId: id,
    metadata: { ownerId: existing.userId, date: existing.date, normalMins: existing.normalMins, otMins: existing.otMins },
  })
  return NextResponse.json({ success: true })
}
