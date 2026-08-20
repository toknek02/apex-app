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

  const publicHolidays = await prisma.publicHoliday.findMany({ orderBy: { startDate: 'asc' } })
  return NextResponse.json({ publicHolidays })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PUBLIC_HOLIDAYS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { startDate, endDate, name, recurring } = await req.json()
  const parsedStart = typeof startDate === 'string' ? parseLocalDate(startDate) : null
  const parsedEnd = typeof endDate === 'string' ? parseLocalDate(endDate) : (parsedStart ? parsedStart : null)
  if (!parsedStart || !parsedEnd) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  if (parsedEnd.getTime() < parsedStart.getTime()) {
    return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 })
  }
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const existing = await prisma.publicHoliday.findFirst({
    where: { startDate: { lte: parsedEnd }, endDate: { gte: parsedStart } },
  })
  if (existing) return NextResponse.json({ error: `That range overlaps an existing public holiday: ${existing.name}` }, { status: 409 })

  const publicHoliday = await prisma.publicHoliday.create({
    data: { startDate: parsedStart, endDate: parsedEnd, name: name.trim(), recurring: Boolean(recurring) },
  })
  await logAudit({
    actor: session.user,
    action: 'public_holiday.create',
    targetType: 'PublicHoliday',
    targetId: publicHoliday.id,
    targetLabel: publicHoliday.name,
    metadata: { startDate, endDate, recurring: Boolean(recurring) },
  })
  return NextResponse.json({ publicHoliday }, { status: 201 })
}
