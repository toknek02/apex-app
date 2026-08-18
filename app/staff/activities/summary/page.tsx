import { Fragment } from 'react'
import Link from 'next/link'
import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ActivitiesTabs } from '@/components/staff/activities-tabs'
import { GanttRangeControl } from '@/components/staff/gantt-range-control'
import { DepartmentFilter } from '@/components/staff/department-filter'
import { LeaveGroupFilter } from '@/components/staff/leave-group-filter'
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

const DEFAULT_START_HOUR = 9
const DEFAULT_END_HOUR = 18

function formatHour(h: number) {
  const period = h < 12 || h === 24 ? 'am' : 'pm'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${period}`
}

function formatHrs(totalMins: number) {
  const hrs = totalMins / 60
  return hrs.toFixed(hrs % 1 === 0 ? 0 : 1)
}

type Entry = {
  id: string
  eventType: string
  project: { code: string; shortName: string } | null
  normalMins: number
  otMins: number
  startMins: number | null
  endMins: number | null
  remarks: string | null
}

function entryColor(eventType: string) {
  if (LEAVE_EVENT_TYPES.includes(eventType)) return 'var(--apex-red)'
  if (eventType === 'Project Work') return 'var(--apex-accent)'
  if (eventType === 'Admin Work') return 'var(--apex-navy)'
  if (eventType === 'Marketing') return 'var(--apex-green)'
  return 'var(--apex-muted)'
}

function entryTitle(e: Entry) {
  const isLeave = LEAVE_EVENT_TYPES.includes(e.eventType)
  const totalHrs = e.normalMins + e.otMins
  const parts = [e.eventType]
  if (e.project) parts.push(`— ${e.project.code}`)
  if (e.startMins !== null && e.endMins !== null) {
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    parts.push(`(${fmt(e.startMins)}–${fmt(e.endMins)})`)
  } else if (!isLeave && totalHrs > 0) {
    parts.push(`(${formatHrs(totalHrs)}h)`)
  }
  let title = parts.join(' ')
  // Leave reasons are personal (medical details, etc.) — this page is open
  // to every employee, so don't surface them here. The Leave Calendar,
  // which stays restricted to directors/HR, is where that detail belongs.
  if (!isLeave && e.remarks) title += `: ${e.remarks}`
  return title
}

export default async function ActivitiesSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; startHour?: string; endHour?: string; onlyWithEntries?: string; department?: string; leaveGroup?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const parsedStartHour = Number(sp.startHour)
  const parsedEndHour = Number(sp.endHour)
  const startHour = Number.isInteger(parsedStartHour) && parsedStartHour >= 0 && parsedStartHour < 24 ? parsedStartHour : DEFAULT_START_HOUR
  const endHour = Number.isInteger(parsedEndHour) && parsedEndHour > startHour && parsedEndHour <= 24 ? parsedEndHour : DEFAULT_END_HOUR
  const GANTT_START = startHour * 60
  const GANTT_END = endHour * 60
  const GANTT_SPAN = GANTT_END - GANTT_START
  const HOUR_TICKS = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

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

  // Whereabouts visibility is open to everyone — narrow it down with the
  // Department / Group / "only with entries" filters below instead
  // of gating the whole page behind a permission.
  const [staff, entries, leaveGroups] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      include: { leaveGroupMemberships: { select: { leaveGroupId: true } } },
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
    }),
    prisma.timesheetEntry.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      include: { project: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.leaveGroup.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const entriesByUser = new Map<string, Entry[]>()
  for (const e of entries) {
    if (!entriesByUser.has(e.userId)) entriesByUser.set(e.userId, [])
    entriesByUser.get(e.userId)!.push(e)
  }

  const departments = [...new Set(staff.map((s) => s.department ?? 'UNASSIGNED'))].sort()
  const selectedDepartment = sp.department && departments.includes(sp.department) ? sp.department : ''
  const selectedLeaveGroup = sp.leaveGroup && leaveGroups.some((g) => g.id === sp.leaveGroup) ? sp.leaveGroup : ''

  const onlyWithEntries = sp.onlyWithEntries === '1'
  const visibleStaff = staff
    .filter((s) => !onlyWithEntries || (entriesByUser.get(s.id)?.length ?? 0) > 0)
    .filter((s) => !selectedDepartment || (s.department ?? 'UNASSIGNED') === selectedDepartment)
    .filter((s) => !selectedLeaveGroup || s.leaveGroupMemberships.some((m) => m.leaveGroupId === selectedLeaveGroup))

  const grouped = new Map<string, typeof staff>()
  for (const s of visibleStaff) {
    const dept = s.department ?? 'UNASSIGNED'
    if (!grouped.has(dept)) grouped.set(dept, [])
    grouped.get(dept)!.push(s)
  }

  const dateLabel = selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const isToday = ymd(selectedDate) === ymd(today)
  // Preserve the chosen chart range and filter across day navigation,
  // otherwise they'd silently reset every time you click Prev/Next Day.
  const hourQuery = (startHour !== DEFAULT_START_HOUR || endHour !== DEFAULT_END_HOUR) ? `&startHour=${startHour}&endHour=${endHour}` : ''
  const onlyQuery = onlyWithEntries ? '&onlyWithEntries=1' : ''
  const deptQuery = selectedDepartment ? `&department=${encodeURIComponent(selectedDepartment)}` : ''
  const groupQuery = selectedLeaveGroup ? `&leaveGroup=${encodeURIComponent(selectedLeaveGroup)}` : ''
  const persistedQuery = `${hourQuery}${onlyQuery}${deptQuery}${groupQuery}`
  const toggleOnlyHref = `/staff/activities/summary?date=${ymd(selectedDate)}${hourQuery}${deptQuery}${groupQuery}${onlyWithEntries ? '' : '&onlyWithEntries=1'}`

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Activities', 'Summary']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>WHEREABOUTS SUMMARY — {dateLabel}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href={`/staff/activities/summary?date=${ymd(prevDay)}${persistedQuery}`} style={navBtn}>&lt; Prev Day</Link>
          {!isToday && (
            <Link href={`/staff/activities/summary?date=${ymd(today)}${persistedQuery}`} style={navBtn}>Today</Link>
          )}
          <Link href={`/staff/activities/summary?date=${ymd(nextDay)}${persistedQuery}`} style={navBtn}>Next Day &gt;</Link>
        </div>
      </div>

      <ActivitiesTabs active="summary" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: 'var(--apex-muted)' }}>
        {[
          ['Project Work', entryColor('Project Work')],
          ['Admin Work', entryColor('Admin Work')],
          ['Marketing', entryColor('Marketing')],
          ['Leave', entryColor('Annual Leave')],
        ].map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
        <Link href={toggleOnlyHref} style={{ fontSize: 11, color: onlyWithEntries ? 'var(--apex-accent)' : 'var(--apex-muted)', fontWeight: onlyWithEntries ? 700 : 400 }}>
          {onlyWithEntries ? '✓ Only staff with entries' : 'Only staff with entries'}
        </Link>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <DepartmentFilter departments={departments} selected={selectedDepartment} />
          <LeaveGroupFilter leaveGroups={leaveGroups} selected={selectedLeaveGroup} />
          <GanttRangeControl startHour={startHour} endHour={endHour} />
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              <th style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', width: 160 }}>
                Staff
              </th>
              <th style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', color: '#fff', fontSize: 10, fontWeight: 600 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {HOUR_TICKS.map((h) => (
                    <span key={h}>{formatHour(h)}</span>
                  ))}
                </div>
              </th>
              <th style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'right', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', width: 70 }}>
                Total Hrs
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped.size === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, fontStyle: 'italic', color: 'var(--apex-muted)' }}>
                  {selectedDepartment || selectedLeaveGroup ? 'No staff match the current filters.' : 'No staff have entries for this day.'}
                </td>
              </tr>
            )}
            {[...grouped.entries()].map(([dept, members]) => (
              <Fragment key={dept}>
                <tr>
                  <td colSpan={3} style={{ padding: '6px 14px', backgroundColor: 'var(--apex-dept-bg)', fontSize: 11, fontWeight: 700, color: 'var(--apex-tbl-hdr)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Department: {dept}
                  </td>
                </tr>
                {members.map((m, i) => {
                  const myEntries = entriesByUser.get(m.id) ?? []
                  const totalMins = myEntries.reduce((sum, e) => sum + e.normalMins + e.otMins, 0)

                  const placed = myEntries.filter((e) => e.startMins !== null && e.endMins !== null || LEAVE_EVENT_TYPES.includes(e.eventType))
                  const unplaced = myEntries.filter((e) => e.startMins === null && e.endMins === null && !LEAVE_EVENT_TYPES.includes(e.eventType))

                  return (
                    <tr key={m.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, fontWeight: 600, verticalAlign: 'top' }}>{m.name}</td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', verticalAlign: 'top' }}>
                        {placed.length === 0 && unplaced.length === 0 ? (
                          <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--apex-muted)' }}>No entries</div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            {/* hour gridlines behind the bars */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
                              {HOUR_TICKS.map((h) => (
                                <span key={h} style={{ width: 1, backgroundColor: 'var(--apex-border)' }} />
                              ))}
                            </div>
                            {placed.map((e) => {
                              const isFullDayLeave = e.startMins === null && LEAVE_EVENT_TYPES.includes(e.eventType)
                              const left = isFullDayLeave ? 0 : Math.max(0, Math.min(1, (e.startMins! - GANTT_START) / GANTT_SPAN)) * 100
                              const right = isFullDayLeave ? 100 : Math.max(0, Math.min(1, (e.endMins! - GANTT_START) / GANTT_SPAN)) * 100
                              const width = Math.max(right - left, 1.5)
                              return (
                                <div
                                  key={e.id}
                                  title={entryTitle(e)}
                                  style={{
                                    position: 'relative',
                                    height: 22,
                                    marginBottom: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: `${left}%`,
                                      width: `${width}%`,
                                      height: '100%',
                                      backgroundColor: entryColor(e.eventType),
                                      borderRadius: 4,
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '0 6px',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <span style={{ fontSize: 10, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {isFullDayLeave ? e.eventType : entryTitle(e)}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                            {unplaced.map((e) => (
                              <div key={e.id} style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 4 }}>
                                {e.eventType}{e.project ? ` — ${e.project.code}` : ''} ({formatHrs(e.normalMins + e.otMins)}h) — no time set
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)', textAlign: 'right', verticalAlign: 'top' }}>
                        {totalMins > 0 ? formatHrs(totalMins) : ''}
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
