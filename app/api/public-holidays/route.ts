import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { parseLocalDate } from '@/lib/date-utils'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PUBLIC_HOLIDAYS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const publicHolidays = await prisma.publicHoliday.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json({ publicHolidays })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PUBLIC_HOLIDAYS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { date, name } = await req.json()
  const parsedDate = typeof date === 'string' ? parseLocalDate(date) : null
  if (!parsedDate) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const existing = await prisma.publicHoliday.findUnique({ where: { date: parsedDate } })
  if (existing) return NextResponse.json({ error: 'That date is already marked as a public holiday' }, { status: 409 })

  const publicHoliday = await prisma.publicHoliday.create({ data: { date: parsedDate, name: name.trim() } })
  await logAudit({
    actor: session.user,
    action: 'public_holiday.create',
    targetType: 'PublicHoliday',
    targetId: publicHoliday.id,
    targetLabel: publicHoliday.name,
    metadata: { date },
  })
  return NextResponse.json({ publicHoliday }, { status: 201 })
}
