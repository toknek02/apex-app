import { Fragment } from 'react'
import Link from 'next/link'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ActivitiesTabs } from '@/components/staff/activities-tabs'
import { LEAVE_EVENT_TYPES } from '@/lib/timesheet-event-types'

// Local calendar date, not UTC — toISOString() would roll back a day for any
// server timezone east of UTC once the local time crosses midnight, which
// broke the Prev/Next Day links (they'd point at the wrong date entirely).
function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function entryLabel(e: { eventType: string; project: { code: string; shortName: string } | null; normalMins: number; otMins: number; remarks: string | null }) {
  const totalHrs = (e.normalMins + e.otMins) / 60
  const isLeave = LEAVE_EVENT_TYPES.includes(e.eventType)
  const parts = [e.eventType]
  if (e.project) parts.push(`— ${e.project.code}`)
  if (!isLeave && totalHrs > 0) parts.push(`(${totalHrs.toFixed(totalHrs % 1 === 0 ? 0 : 1)}h)`)
  let label = parts.join(' ')
  if (e.remarks) label += `: ${e.remarks}`
  return label
}

export default async function ActivitiesSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const today = new Date()
  // Parse date-only query params as local calendar components, not via
  // `new Date("YYYY-MM-DD")` (which parses as UTC midnight and would land on
  // the wrong local day for timezones west of UTC).
  const dateMatch = sp.date?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const selectedDate = dateMatch ? new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])) : today
  const dayStart = new Date(selectedDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(selectedDate)
  dayEnd.setHours(23, 59, 59, 999)

  const prevDay = new Date(dayStart)
  prevDay.setDate(prevDay.getDate() - 1)
  const nextDay = new Date(dayStart)
  nextDay.setDate(nextDay.getDate() + 1)

  // Same tiering as the "Current" tab — company-wide whereabouts is only
  // meaningful to someone with oversight responsibility.
  const isPrivileged =
    hasPermission(user, 'VIEW_TIMESHEET_REPORTS') ||
    hasPermission(user, 'MANAGE_PROJECTS') ||
    hasPermission(user, 'MANAGE_USERS')

  const [allStaff, entries] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: [{ department: 'asc' }, { name: 'asc' }] }),
    prisma.timesheetEntry.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        ...(isPrivileged ? {} : { userId: user.id }),
      },
      include: { project: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const staff = isPrivileged ? allStaff : allStaff.filter((s) => s.id === user.id)

  const entriesByUser = new Map<string, typeof entries>()
  for (const e of entries) {
    if (!entriesByUser.has(e.userId)) entriesByUser.set(e.userId, [])
    entriesByUser.get(e.userId)!.push(e)
  }

  const grouped = new Map<string, typeof staff>()
  for (const s of staff) {
    const dept = s.department ?? 'UNASSIGNED'
    if (!grouped.has(dept)) grouped.set(dept, [])
    grouped.get(dept)!.push(s)
  }

  const dateLabel = selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const isToday = ymd(selectedDate) === ymd(today)

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Activities', 'Summary']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>WHEREABOUTS SUMMARY — {dateLabel}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href={`/staff/activities/summary?date=${ymd(prevDay)}`} style={navBtn}>&lt; Prev Day</Link>
          {!isToday && (
            <Link href={`/staff/activities/summary?date=${ymd(today)}`} style={navBtn}>Today</Link>
          )}
          <Link href={`/staff/activities/summary?date=${ymd(nextDay)}`} style={navBtn}>Next Day &gt;</Link>
        </div>
      </div>

      <ActivitiesTabs active="summary" />

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Staff', 'Whereabouts', 'Total Hrs'].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...grouped.entries()].map(([dept, members]) => (
              <Fragment key={dept}>
                <tr>
                  <td colSpan={3} style={{ padding: '6px 14px', backgroundColor: 'var(--apex-dept-bg)', fontSize: 11, fontWeight: 700, color: 'var(--apex-tbl-hdr)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Department: {dept}
                  </td>
                </tr>
                {members.map((m, i) => {
                  const myEntries = entriesByUser.get(m.id) ?? []
                  const totalHrs = myEntries.reduce((sum, e) => sum + e.normalMins + e.otMins, 0) / 60

                  return (
                    <tr key={m.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600 }}>{m.name}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: myEntries.length ? 'var(--apex-text)' : 'var(--apex-muted)', fontStyle: myEntries.length ? 'normal' : 'italic' }}>
                        {myEntries.length === 0
                          ? 'No entries'
                          : myEntries.map((e) => <div key={e.id}>{entryLabel(e)}</div>)}
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>
                        {totalHrs > 0 ? totalHrs.toFixed(totalHrs % 1 === 0 ? 0 : 1) : ''}
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
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
