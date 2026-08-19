import { Fragment } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { DeleteTimesheetEntryButton } from '@/components/staff/delete-timesheet-entry-button'
import { TimesheetStaffSelector } from '@/components/staff/timesheet-staff-selector'
import { TimesheetTabs } from '@/components/staff/timesheet-tabs'
import { isEntryLocked, TIMESHEET_EDIT_WINDOW_DAYS } from '@/lib/timesheet-lock'

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; userId?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const canViewOthers = hasPermission(user, 'VIEW_TIMESHEET_REPORTS')
  const canManageEntries = hasPermission(user, 'MANAGE_TIMESHEET_ENTRIES')
  const viewingUserId = canViewOthers && sp.userId ? sp.userId : user.id
  const isOwnView = viewingUserId === user.id

  const now = new Date()
  const [yearStr, monthStr] = (sp.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) - 1 // 0-indexed

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const daysInMonth = monthEnd.getDate()
  const monthLabel = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const prevMonth = new Date(year, month - 1, 1)
  const nextMonth = new Date(year, month + 1, 1)
  const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  const nextKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
  const userQuery = !isOwnView ? `&userId=${viewingUserId}` : ''

  const [staff, records, viewedUser, myEntries] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: [{ department: 'asc' }, { name: 'asc' }] }),
    prisma.signInRecord.findMany({ where: { signInAt: { gte: monthStart, lte: monthEnd } } }),
    isOwnView ? Promise.resolve(user) : prisma.user.findUnique({ where: { id: viewingUserId } }),
    prisma.timesheetEntry.findMany({
      where: { userId: viewingUserId, date: { gte: monthStart, lte: monthEnd } },
      include: { project: true },
      orderBy: { date: 'asc' },
    }),
  ])

  const totalNormalMins = myEntries.reduce((sum, e) => sum + e.normalMins, 0)
  const totalOtMins = myEntries.reduce((sum, e) => sum + e.otMins, 0)

  const signedDays = new Map<string, Set<number>>() // userId -> set of day numbers
  for (const r of records) {
    if (!signedDays.has(r.userId)) signedDays.set(r.userId, new Set())
    signedDays.get(r.userId)!.add(r.signInAt.getDate())
  }

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  // Without VIEW_TIMESHEET_REPORTS, only your own row belongs on this grid —
  // it was previously showing every staff member's sign-in days to anyone
  // logged in, regardless of permission.
  const attendanceStaff = canViewOthers ? staff : staff.filter((s) => s.id === user.id)

  // Grouped by department, same convention as Staff Directory — with 90+
  // staff on this grid, a flat list made it hard to find anyone.
  const attendanceByDept = new Map<string, typeof attendanceStaff>()
  for (const s of attendanceStaff) {
    const dept = s.department ?? 'UNASSIGNED'
    if (!attendanceByDept.has(dept)) attendanceByDept.set(dept, [])
    attendanceByDept.get(dept)!.push(s)
  }

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Timesheet']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Timesheet — {monthLabel}
      </h1>

      <TimesheetTabs active="attendance" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href={`/staff/timesheet?month=${prevKey}${userQuery}`} style={navBtn}>&lt; Prev Month</Link>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{monthLabel}</span>
        <Link href={`/staff/timesheet?month=${nextKey}${userQuery}`} style={navBtn}>Next Month &gt;</Link>
        {canViewOthers && (
          <TimesheetStaffSelector staff={staff.map((s) => ({ id: s.id, name: s.name }))} selectedUserId={viewingUserId} />
        )}
        <a
          href={`/api/timesheet-entries?from=${ymd(monthStart)}&to=${ymd(monthEnd)}&format=xlsx${userQuery}`}
          style={{ ...navBtn, marginLeft: 'auto', color: 'var(--apex-green)', borderColor: 'var(--apex-green)' }}
        >
          Download
        </a>
        <Link href="/staff/timesheet/reports" style={navBtn}>
          Reports
        </Link>
        {isOwnView && (
          <Link href="/staff/timesheet/new" style={{ ...navBtn, backgroundColor: 'var(--apex-navy)', color: '#fff', borderColor: 'var(--apex-navy)' }}>
            + New Entry
          </Link>
        )}
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              <th style={{ ...thStyle, position: 'sticky', left: 0, backgroundColor: 'var(--apex-tbl-hdr)', minWidth: 160, textAlign: 'left' }}>Staff</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isToday = isCurrentMonth && today.getDate() === day
                return (
                  <th key={day} style={{ ...thStyle, backgroundColor: isToday ? 'var(--apex-accent)' : 'var(--apex-tbl-hdr)', minWidth: 26 }}>
                    {day}
                  </th>
                )
              })}
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {[...attendanceByDept.entries()].map(([dept, members]) => (
              <Fragment key={dept}>
                <tr>
                  <td
                    colSpan={daysInMonth + 2}
                    style={{ padding: '6px 14px', backgroundColor: 'var(--apex-dept-bg)', fontSize: 11, fontWeight: 700, color: 'var(--apex-tbl-hdr)', letterSpacing: '0.06em', textTransform: 'uppercase', position: 'sticky', left: 0 }}
                  >
                    Department: {dept}
                  </td>
                </tr>
                {members.map((s, i) => {
                  const days = signedDays.get(s.id) ?? new Set<number>()
                  return (
                    <tr key={s.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ ...tdStyle, position: 'sticky', left: 0, backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff', textAlign: 'left', fontWeight: 600 }}>
                        {s.name}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, di) => di + 1).map((day) => {
                        const isToday = isCurrentMonth && today.getDate() === day
                        return (
                          <td key={day} style={{ ...tdStyle, backgroundColor: isToday ? 'var(--apex-accent-lt)' : undefined }}>
                            {days.has(day) ? <span style={{ color: 'var(--apex-green)', fontWeight: 700 }}>✓</span> : <span style={{ color: 'var(--apex-border)' }}>—</span>}
                          </td>
                        )
                      })}
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{days.size}</td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--apex-muted)' }}>
        <span style={{ color: 'var(--apex-green)', fontWeight: 700 }}>✓</span> Signed In &nbsp;·&nbsp; — No Record
      </div>

      <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, marginTop: 28, marginBottom: 12 }}>
        {isOwnView ? 'My Timesheet Entries' : `${viewedUser?.name ?? 'Unknown'}’s Timesheet Entries`}
      </h2>
      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Date', 'Event Type', 'Project', 'Stage / Task', 'Normal', 'OT', 'Remarks', ''].map((h) => (
                <th key={h} style={{ ...thStyle, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myEntries.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: 'left', color: 'var(--apex-muted)' }}>
                  No entries yet this month.
                </td>
              </tr>
            ) : (
              myEntries.map((e, i) => (
                <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{e.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{e.eventType}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{e.project ? `${e.project.code} — ${e.project.shortName}` : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{[e.stage, e.task].filter(Boolean).join(' / ') || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{(e.normalMins / 60).toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{(e.otMins / 60).toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{e.remarks || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>
                    {canManageEntries ? (
                      <DeleteTimesheetEntryButton entryId={e.id} />
                    ) : isOwnView ? (
                      isEntryLocked(e.date) ? (
                        <span title={`Entries older than ${TIMESHEET_EDIT_WINDOW_DAYS} days can no longer be self-deleted`}>
                          <Lock size={13} color="var(--apex-muted)" />
                        </span>
                      ) : (
                        <DeleteTimesheetEntryButton entryId={e.id} />
                      )
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {myEntries.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>Monthly Total</td>
                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700 }}>{(totalNormalMins / 60).toFixed(2)}</td>
                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700 }}>{(totalOtMins / 60).toFixed(2)}</td>
                <td style={tdStyle} />
                <td style={tdStyle} />
              </tr>
            </tfoot>
          )}
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

const thStyle: React.CSSProperties = {
  padding: '6px 4px',
  color: '#fff',
  fontSize: 10,
  fontWeight: 600,
  textAlign: 'center',
  borderRight: '1px solid var(--apex-border)',
}

const tdStyle: React.CSSProperties = {
  padding: '6px 4px',
  fontSize: 11,
  textAlign: 'center',
  borderRight: '1px solid var(--apex-border)',
}
