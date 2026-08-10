import Link from 'next/link'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/layout/app-shell'

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

export default async function DashboardPage() {
  const user = await requireUser()
  const today = new Date()

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

  const [todaysEvents, signedIn, activeProjectCount, totalActiveUsers, myMembershipCount, myMonthEntries, mySignIn, latestAnnouncements] = await Promise.all([
    prisma.event.findMany({
      where: {
        date: { gte: startOfDay(today), lte: endOfDay(today) },
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
      : prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, createdAt: true } }),
  ])

  const myMonthMins = myMonthEntries.reduce((sum, e) => sum + e.normalMins + e.otMins, 0)

  const cards = isPrivileged
    ? [
        { label: 'Total Events Today', value: todaysEvents.length },
        { label: 'Staff Signed In', value: signedIn.length },
        { label: 'Active Projects', value: activeProjectCount },
        { label: 'Staff Not Signed In', value: Math.max(totalActiveUsers - signedIn.length, 0) },
      ]
    : [
        { label: 'Total Events Today', value: todaysEvents.length },
        { label: 'My Status', value: mySignIn ? 'Signed In' : 'Not Signed In', color: mySignIn ? 'var(--apex-green)' : 'var(--apex-muted)' },
        { label: 'My Active Projects', value: myMembershipCount },
        { label: 'My Hours This Month', value: (myMonthMins / 60).toFixed(1) },
      ]

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 18 }}
          >
            <div style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'color' in c ? c.color : 'var(--apex-navy)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--apex-tbl-hdr)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            Today&apos;s Events
          </div>
          {todaysEvents.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>No events scheduled today.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {todaysEvents.map((e, i) => (
                  <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                    <td style={{ padding: '9px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {e.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>
                      {e.attendees.map((a) => a.user.name).join(', ')}
                      {e.attendees.length > 0 ? ': ' : ''}
                      {e.title}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>
                      {e.venue?.description ?? e.externalVenue ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isPrivileged ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--apex-tbl-hdr)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              Staff Activity Snapshot
            </div>
            {signedIn.length === 0 ? (
              <div style={{ padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>No staff currently signed in.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {signedIn.map((s, i) => (
                  <li
                    key={s.id}
                    style={{
                      padding: '9px 16px',
                      fontSize: 12,
                      backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff',
                      borderBottom: '1px solid var(--apex-border)',
                    }}
                  >
                    <strong>{s.user.name}</strong> — Signed in at{' '}
                    {s.signInAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--apex-tbl-hdr)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              Latest Announcements
            </div>
            {latestAnnouncements.length === 0 ? (
              <div style={{ padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>No announcements yet.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {latestAnnouncements.map((a, i) => (
                  <li
                    key={a.id}
                    style={{
                      padding: '9px 16px',
                      fontSize: 12,
                      backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff',
                      borderBottom: '1px solid var(--apex-border)',
                    }}
                  >
                    <Link href="/announcements" style={{ color: 'var(--apex-text)', textDecoration: 'none', fontWeight: 600 }}>
                      {a.title}
                    </Link>
                    <div style={{ fontSize: 10, color: 'var(--apex-muted)', marginTop: 2 }}>
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
