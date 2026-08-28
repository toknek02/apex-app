import Link from 'next/link'
import { Lock } from 'lucide-react'
import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { NavTabs, TIMESHEET_TABS } from '@/components/staff/nav-tabs'
import { DeleteTimesheetEntryButton } from '@/components/staff/delete-timesheet-entry-button'
import { isEntryLocked, TIMESHEET_EDIT_WINDOW_DAYS } from '@/lib/timesheet-lock'

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Same content as the "Timesheet Entries" table on the main Attendance page,
// but scoped to only the logged-in user and without the everyone-in-the-
// company attendance grid above it — that grid makes it hard to find your
// own entries once the staff list gets long, which is the whole reason this
// tab exists.
export default async function MyTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const now = new Date()
  const [yearStr, monthStr] = (sp.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) - 1

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const monthLabel = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const prevMonth = new Date(year, month - 1, 1)
  const nextMonth = new Date(year, month + 1, 1)
  const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  const nextKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

  const myEntries = await prisma.timesheetEntry.findMany({
    where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
    include: { project: true },
    orderBy: { date: 'asc' },
  })

  const totalNormalMins = myEntries.reduce((sum, e) => sum + e.normalMins, 0)
  const totalOtMins = myEntries.reduce((sum, e) => sum + e.otMins, 0)

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Timesheet', 'My Timesheet']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        My Timesheet — {monthLabel}
      </h1>

      <NavTabs tabs={TIMESHEET_TABS} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href={`/staff/timesheet/mine?month=${prevKey}`} style={navBtn}>&lt; Prev Month</Link>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{monthLabel}</span>
        <Link href={`/staff/timesheet/mine?month=${nextKey}`} style={navBtn}>Next Month &gt;</Link>
        <a
          href={`/api/timesheet-entries?from=${ymd(monthStart)}&to=${ymd(monthEnd)}&format=xlsx`}
          style={{ ...navBtn, marginLeft: 'auto', color: 'var(--apex-green)', borderColor: 'var(--apex-green)' }}
        >
          Download
        </a>
        <Link href="/staff/timesheet/new" style={{ ...navBtn, backgroundColor: 'var(--apex-navy)', color: '#fff', borderColor: 'var(--apex-navy)' }}>
          + New Entry
        </Link>
      </div>

      <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
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
                <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{e.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{e.eventType}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{e.project ? `${e.project.code} — ${e.project.shortName}` : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{[e.stage, e.task].filter(Boolean).join(' / ') || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{(e.normalMins / 60).toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{(e.otMins / 60).toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>{e.remarks || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'left' }}>
                    {isEntryLocked(e.date) ? (
                      <span title={`Entries older than ${TIMESHEET_EDIT_WINDOW_DAYS} days can no longer be self-deleted`}>
                        <Lock size={13} color="var(--apex-muted)" />
                      </span>
                    ) : (
                      <DeleteTimesheetEntryButton entryId={e.id} />
                    )}
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
  backgroundColor: 'var(--apex-surface)',
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
