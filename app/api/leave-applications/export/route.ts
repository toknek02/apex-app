import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildLeaveCalendarWorkbook } from '@/lib/leave-calendar-export'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')
  const department = searchParams.get('department') ?? ''
  const leaveGroup = searchParams.get('leaveGroup') ?? ''

  const now = new Date()
  const [yearStr, monthStr] = (monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) - 1
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
  }
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  const monthLabel = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // Same open visibility as the Leave Calendar page itself.
  const allStaff = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, department: true, leaveGroupMemberships: { select: { leaveGroupId: true } } },
  })

  const filteredStaff = allStaff
    .filter((s) => !department || (s.department ?? 'UNASSIGNED') === department)
    .filter((s) => !leaveGroup || s.leaveGroupMemberships.some((m) => m.leaveGroupId === leaveGroup))
  const staffById = new Map(filteredStaff.map((s) => [s.id, s]))

  const applications = await prisma.leaveApplication.findMany({
    where: {
      userId: { in: filteredStaff.map((s) => s.id) },
      status: { in: ['PENDING_ARCHITECT', 'PENDING_DIRECTOR', 'APPROVED'] },
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    include: { project: { select: { code: true, shortName: true } } },
  })

  const buffer = await buildLeaveCalendarWorkbook({
    applications: applications.map((a) => ({
      userName: staffById.get(a.userId)?.name ?? 'Unknown',
      department: staffById.get(a.userId)?.department ?? null,
      leaveType: a.leaveType,
      project: a.project ? `${a.project.code} — ${a.project.shortName}` : '',
      startDate: a.startDate,
      endDate: a.endDate,
      dayPortion: a.dayPortion,
      status: a.status,
    })),
    monthLabel,
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="leave-calendar-${yearStr}-${monthStr}.xlsx"`,
    },
  })
}
