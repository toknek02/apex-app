import Link from 'next/link'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/layout/app-shell'
import { getAnnualLeaveBalance } from '@/lib/leave-balance'
import { getPendingApprovalCount } from '@/lib/leave-approval'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
// Monday-start work week, matching the convention used everywhere else in
// the app (e.g. the timesheet grid).
function startOfWeek(d: Date) {
  const x = startOfDay(d)
  const day = x.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}
function endOfWeek(d: Date) {
  const x = startOfWeek(d)
  x.setDate(x.getDate() + 6)
  return endOfDay(x)
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser()
  const sp = await searchParams
  const eventsView = sp.view === 'week' ? 'week' : 'day'
  const today = new Date()
  const eventsRangeStart = eventsView === 'week' ? startOfWeek(today) : startOfDay(today)
  const eventsRangeEnd = eventsView === 'week' ? endOfWeek(today) : endOfDay(today)

  // Company-wide staff/attendance stats and the Activity Snapshot are only
  // meaningful to people with some oversight responsibility — a regular
  // employee doesn't need to see who else is signed in or how many active
  // projects the company has running.
  const isPrivileged =
    hasPermission(user, 'VIEW_TIMESHEET_REPORTS') ||
    hasPermission(user, 'MANAGE_PROJECTS') ||
    hasPermission(user, 'MANAGE_USERS')

  // Same private-event visibility rule as /logbook — without this, a
  // private event happening today would leak onto the dashboard for
  // everyone regardless of that page's own filtering.
  const canSeeAllPrivate = hasPermission(user, 'EDIT_ANY_EVENT')

  const [logbookEvents, signedIn, activeProjectCount, totalActiveUsers, myMembershipCount, myMonthEntries, mySignIn, latestAnnouncements, annualLeaveBalance, pendingApproval] = await Promise.all([
    prisma.event.findMany({
      where: {
        date: { gte: eventsRangeStart, lte: eventsRangeEnd },
        ...(canSeeAllPrivate ? {} : { OR: [{ private: false }, { createdById: user.id }, { attendees: { some: { userId: user.id } } }] }),
      },
      include: { venue: true, attendees: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { date: 'asc' },
    }),
    isPrivileged
      ? prisma.signInRecord.findMany({
          where: { signOutAt: null },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { signInAt: 'asc' },
        })
      : Promise.resolve([]),
    isPrivileged ? prisma.project.count({ where: { status: 'Active' } }) : Promise.resolve(0),
    isPrivileged ? prisma.user.count({ where: { isActive: true } }) : Promise.resolve(0),
    isPrivileged ? Promise.resolve(0) : prisma.projectMember.count({ where: { userId: user.id, project: { status: 'Active' } } }),
    isPrivileged
      ? Promise.resolve([])
      : prisma.timesheetEntry.findMany({
          where: { userId: user.id, date: { gte: startOfMonth(today), lte: endOfMonth(today) } },
          select: { normalMins: true, otMins: true },
        }),
    isPrivileged ? Promise.resolve(null) : prisma.signInRecord.findFirst({ where: { userId: user.id, signOutAt: null } }),
    isPrivileged
      ? Promise.resolve([])
      : prisma.announcement.findMany({
          where: { OR: [{ recipients: { none: {} } }, { recipients: { some: { userId: user.id } } }] },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, createdAt: true },
        }),
    getAnnualLeaveBalance(user.id),
    getPendingApprovalCount(user),
  ])

  const myMonthMins = myMonthEntries.reduce((sum, e) => sum + e.normalMins + e.otMins, 0)

  const eventsCardLabel = eventsView === 'week' ? 'LogBook Events This Week' : 'LogBook Events Today'
  const cards: { label: string; value: string | number; color?: string; href?: string }[] = isPrivileged
    ? [
        { label: eventsCardLabel, value: logbookEvents.length },
        { label: 'Staff Signed In', value: signedIn.length },
        { label: 'Active Projects', value: activeProjectCount },
        { label: 'Staff Not Signed In', value: Math.max(totalActiveUsers - signedIn.length, 0) },
      ]
    : [
        { label: eventsCardLabel, value: logbookEvents.length },
        { label: 'My Status', value: mySignIn ? 'Signed In' : 'Not Signed In', color: mySignIn ? 'var(--apex-green)' : 'var(--apex-muted)' },
        { label: 'My Active Projects', value: myMembershipCount },
        { label: 'My Hours This Month', value: (myMonthMins / 60).toFixed(1) },
      ]

  // Only shown to whoever actually holds architect/director authority on a
  // group (or the MANAGE_LEAVE_GROUPS override) — meaningless clutter for
  // everyone else, who will never approve anything.
  if (pendingApproval.hasAuthority) {
    cards.push({
      label: 'Pending My Approval',
      value: pendingApproval.count,
      color: pendingApproval.count > 0 ? 'var(--apex-accent)' : undefined,
      href: '/staff/leave',
    })
  }
  // Only shown once HR has actually set an entitlement — otherwise it's
  // just a confusing "0" for staff who aren't tracked yet.
  if (annualLeaveBalance.totalAvailable !== null) {
    cards.push({
      label: 'Annual Leave Remaining',
      value: annualLeaveBalance.remaining ?? 0,
      color: (annualLeaveBalance.remaining ?? 0) <= 0 ? 'var(--apex-red)' : 'var(--apex-green)',
      href: '/profile',
    })
  }

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <div className="apex-page-head">
        <div>
          <h1 className="apex-page-title">Dashboard</h1>
          <p className="apex-page-sub">
            {today.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        {cards.map((c) => {
          const inner = (
            <>
              <div className="apex-stat-label">{c.label}</div>
              <div className="apex-stat-value" style={c.color ? { color: c.color } : undefined}>{c.value}</div>
            </>
          )
          return c.href ? (
            <Link key={c.label} href={c.href} className="apex-stat">{inner}</Link>
          ) : (
            <div key={c.label} className="apex-stat">{inner}</div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16 }}>
        <div className="apex-card">
          <div className="apex-card-header">
            <span>LogBook Events</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Link href="/?view=day" className={`apex-btn apex-btn-sm${eventsView === 'day' ? ' apex-btn-primary' : ''}`}>Today</Link>
              <Link href="/?view=week" className={`apex-btn apex-btn-sm${eventsView === 'week' ? ' apex-btn-primary' : ''}`}>This Week</Link>
            </div>
          </div>
          {logbookEvents.length === 0 ? (
            <div className="apex-empty">No LogBook events {eventsView === 'week' ? 'this week' : 'scheduled today'}.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="apex-table">
                <thead>
                  <tr>
                    {eventsView === 'week' && <th>Date</th>}
                    <th>Time</th>
                    <th>Event</th>
                    <th>Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {logbookEvents.map((e) => (
                    <tr key={e.id}>
                      {eventsView === 'week' && (
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--apex-muted)' }}>
                          {e.date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </td>
                      )}
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--apex-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {e.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td>
                        {e.attendees.length > 0 && (
                          <span style={{ color: 'var(--apex-muted)' }}>{e.attendees.map((a) => a.user.name).join(', ')}: </span>
                        )}
                        {e.title}
                      </td>
                      <td style={{ color: 'var(--apex-muted)' }}>{e.venue?.description ?? e.externalVenue ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isPrivileged ? (
          <div className="apex-card">
            <div className="apex-card-header">Staff Activity Snapshot</div>
            {signedIn.length === 0 ? (
              <div className="apex-empty">No staff currently signed in.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {signedIn.map((s) => (
                  <li key={s.id} style={{ padding: '10px 16px', fontSize: 13, borderBottom: '1px solid var(--apex-border)' }}>
                    <strong>{s.user.name}</strong>
                    <span style={{ color: 'var(--apex-muted)' }}>
                      {' '}— signed in {s.signInAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="apex-card">
            <div className="apex-card-header">Latest Announcements</div>
            {latestAnnouncements.length === 0 ? (
              <div className="apex-empty">No announcements yet.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {latestAnnouncements.map((a) => (
                  <li key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--apex-border)' }}>
                    <Link href="/announcements" style={{ color: 'var(--apex-text)', fontWeight: 600, fontSize: 13 }}>
                      {a.title}
                    </Link>
                    <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 2 }}>
                      {a.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
