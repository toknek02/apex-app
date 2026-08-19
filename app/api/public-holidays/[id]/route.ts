import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PUBLIC_HOLIDAYS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const publicHoliday = await prisma.publicHoliday.findUnique({ where: { id } })
  if (!publicHoliday) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.publicHoliday.delete({ where: { id } })
  await logAudit({
    actor: session.user,
    action: 'public_holiday.delete',
    targetType: 'PublicHoliday',
    targetId: publicHoliday.id,
    targetLabel: publicHoliday.name,
    metadata: { date: publicHoliday.date },
  })
  return NextResponse.json({ ok: true })
}
