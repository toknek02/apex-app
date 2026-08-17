import { Fragment } from 'react'
import Link from 'next/link'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { LeaveTabs } from '@/components/staff/leave-tabs'
import { LeaveCalendarMonthPicker } from '@/components/staff/leave-calendar-month-picker'
import { enumerateDaysInclusive } from '@/lib/date-utils'
import { LEAVE_EVENT_TYPES } from '@/lib/timesheet-event-types'

// 13 categories need more than a single-letter alphabet and the app's
// handful of semantic --apex- colors can distinguish, so this is its own
// qualitative palette (colors chosen for mutual distinctness, not tied to
// error/success semantics elsewhere in the app).
const LEAVE_TYPE_META: Record<string, { code: string; color: string }> = {
  'Annual Leave': { code: 'AL', color: '#4263eb' },
  'Medical Leave (MC)': { code: 'MC', color: '#e03131' },
  'Emergency Leave': { code: 'EL', color: '#862e9c' },
  'Unpaid Annual Leave': { code: 'UA', color: '#495057' },
  'Unpaid Emergency Leave': { code: 'UE', color: '#5c5f66' },
  'Marriage Leave': { code: 'MR', color: '#e64980' },
  'Maternity Leave': { code: 'MT', color: '#d9a441' },
  'Paternity Leave': { code: 'PT', color: '#ff8787' },
  'Compassionate Leave': { code: 'CL', color: '#1a1a1a' },
  'Study/Exam Leave': { code: 'SE', color: '#adb5bd' },
  'Business Leave': { code: 'BL', color: '#1c7ed6' },
  'Time-off': { code: 'TO', color: '#12b886' },
  'Hospitalisation Leave': { code: 'HL', color: '#fa5252' },
  'Seminar Leave': { code: 'SM', color: '#2b8a3e' },
}

function leaveTypeMeta(leaveType: string) {
  return LEAVE_TYPE_META[leaveType] ?? { code: '??', color: 'var(--apex-muted)' }
}

export default async function LeaveCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const now = new Date()
  const [yearStr, monthStr] = (sp.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) - 1 // 0-indexed

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  const daysInMonth = monthEnd.getDate()
  const monthLabel = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const prevMonth = new Date(year, month - 1, 1)
  const nextMonth = new Date(year, month + 1, 1)
  const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  const nextKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

  // Same tiering as Activities Summary — company-wide visibility needs
  // oversight permission. Directors additionally see their own group's
  // members even without one, since they need to plan around their team's
  // leave regardless of broader reporting permissions.
  const isPrivileged =
    hasPermission(user, 'VIEW_TIMESHEET_REPORTS') ||
    hasPermission(user, 'MANAGE_PROJECTS') ||
    hasPermission(user, 'MANAGE_USERS')

  const [allStaff, directedGroups] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: [{ department: 'asc' }, { name: 'asc' }] }),
    prisma.leaveGroup.findMany({ where: { directorId: user.id }, select: { id: true } }),
  ])

  const directedGroupIds = directedGroups.map((g) => g.id)
  const staff = isPrivileged
    ? allStaff
    : allStaff.filter((s) => s.id === user.id || (s.leaveGroupId && directedGroupIds.includes(s.leaveGroupId)))

  const applications = await prisma.leaveApplication.findMany({
    where: {
      userId: { in: staff.map((s) => s.id) },
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
  })

  // userId -> day-of-month -> application covering that day
  const byUserDay = new Map<string, Map<number, (typeof applications)[number]>>()
  for (const app of applications) {
    const days = enumerateDaysInclusive(app.startDate, app.endDate)
    for (const d of days) {
      if (d.getFullYear() !== year || d.getMonth() !== month) continue
      if (!byUserDay.has(app.userId)) byUserDay.set(app.userId, new Map())
      byUserDay.get(app.userId)!.set(d.getDate(), app)
    }
  }

  const grouped = new Map<string, typeof staff>()
  for (const s of staff) {
    const dept = s.department ?? 'UNASSIGNED'
    if (!grouped.has(dept)) grouped.set(dept, [])
    grouped.get(dept)!.push(s)
  }

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Leave', 'Calendar']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Leave Calendar — {monthLabel}</h1>
        <Link href="/staff/leave/new" style={{ padding: '8px 16px', backgroundColor: 'var(--apex-navy)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          + Apply for Leave
        </Link>
      </div>

      <LeaveTabs active="calendar" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href={`/staff/leave/calendar?month=${prevKey}`} style={navBtn}>&lt; Prev Month</Link>
          <Link href={`/staff/leave/calendar?month=${nextKey}`} style={navBtn}>Next Month &gt;</Link>
        </div>
        <LeaveCalendarMonthPicker year={year} month={month} />
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              <th style={{ ...thStyle, position: 'sticky', left: 0, backgroundColor: 'var(--apex-tbl-hdr)', minWidth: 180, textAlign: 'left' }}>Staff</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isToday = isCurrentMonth && today.getDate() === day
                return (
                  <th key={day} style={{ ...thStyle, backgroundColor: isToday ? 'var(--apex-accent)' : 'var(--apex-tbl-hdr)', minWidth: 32 }}>
                    {day}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {[...grouped.entries()].map(([dept, members]) => (
              <Fragment key={dept}>
                <tr>
                  <td colSpan={daysInMonth + 1} style={{ padding: '6px 14px', backgroundColor: 'var(--apex-dept-bg)', fontSize: 11, fontWeight: 700, color: 'var(--apex-tbl-hdr)', letterSpacing: '0.06em', textTransform: 'uppercase', position: 'sticky', left: 0 }}>
                    Department: {dept}
                  </td>
                </tr>
                {members.map((m, i) => {
                  const dayMap = byUserDay.get(m.id)
                  return (
                    <tr key={m.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ ...tdStyle, position: 'sticky', left: 0, backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff', textAlign: 'left', fontWeight: 600 }}>
                        {m.name}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, di) => di + 1).map((day) => {
                        const isToday = isCurrentMonth && today.getDate() === day
                        const app = dayMap?.get(day)
                        if (!app) {
                          return <td key={day} style={{ ...tdStyle, backgroundColor: isToday ? 'var(--apex-accent-lt)' : undefined }} />
                        }
                        const { code, color } = leaveTypeMeta(app.leaveType)
                        const isPending = app.status === 'PENDING'
                        // Half-day is only visualized on approved (solid) badges —
                        // combining the dashed pending outline with a half-white
                        // fill reads as cluttered, so pending stays a plain outline.
                        const isHalfDay = !isPending && (app.dayPortion === 'AM' || app.dayPortion === 'PM')
                        const halfDayBackground = isHalfDay
                          ? app.dayPortion === 'AM'
                            ? `linear-gradient(to right, #fff 50%, ${color} 50%)`
                            : `linear-gradient(to right, ${color} 50%, #fff 50%)`
                          : undefined
                        return (
                          <td key={day} style={{ ...tdStyle, backgroundColor: isToday ? 'var(--apex-accent-lt)' : undefined, padding: 3 }}>
                            <span
                              title={`${app.leaveType}${isHalfDay ? ` — Half Day (${app.dayPortion})` : ''}${isPending ? ' — Awaiting Approval' : ''}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 20,
                                borderRadius: 4,
                                fontSize: 9,
                                fontWeight: 700,
                                color: isPending ? color : (isHalfDay ? '#000' : '#fff'),
                                backgroundColor: isPending ? '#fff' : (isHalfDay ? undefined : color),
                                background: halfDayBackground,
                                border: isPending ? `1.5px dashed ${color}` : (isHalfDay ? `1px solid ${color}` : 'none'),
                              }}
                            >
                              {code}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--apex-muted)' }}>
        {LEAVE_EVENT_TYPES.map((t) => {
          const { code, color } = leaveTypeMeta(t)
          return (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 16, borderRadius: 4, fontSize: 8, fontWeight: 700, color: '#fff', backgroundColor: color }}>
                {code}
              </span>
              {t}
            </span>
          )
        })}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: 4, border: '1.5px dashed var(--apex-muted)' }} />
          Awaiting Approval
        </span>
      </div>
    </AppShell>
  )
}

const navBtn: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 12,
  textDecoration: 'none',
  color: 'var(--apex-text)',
  backgroundColor: '#fff',
}

const thStyle: React.CSSProperties = {
  padding: '6px 4px',
  color: '#fff',
  fontSize: 10,
  fontWeight: 600,
  textAlign: 'center',
  border: '1px solid var(--apex-border)',
}

const tdStyle: React.CSSProperties = {
  padding: '6px 4px',
  fontSize: 11,
  textAlign: 'center',
  border: '1px solid var(--apex-border)',
}
