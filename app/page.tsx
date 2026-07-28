import { requireUser } from '@/lib/rbac'
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

export default async function DashboardPage() {
  const user = await requireUser()
  const today = new Date()

  const [todaysEvents, signedIn, activeProjectCount, totalStaff] = await Promise.all([
    prisma.event.findMany({
      where: { date: { gte: startOfDay(today), lte: endOfDay(today) } },
      include: { venue: true, attendees: { include: { user: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.signInRecord.findMany({
      where: { signOutAt: null },
      include: { user: true },
      orderBy: { signInAt: 'asc' },
    }),
    prisma.project.count({ where: { status: 'Active' } }),
    prisma.user.count({ where: { role: 'STAFF' } }),
  ])

  const cards = [
    { label: 'Total Events Today', value: todaysEvents.length },
    { label: 'Staff Signed In', value: signedIn.length },
    { label: 'Active Projects', value: activeProjectCount },
    { label: 'Staff Not Signed In', value: Math.max(totalStaff - signedIn.length, 0) },
  ]

  return (
    <AppShell user={{ name: user.name ?? '', role: user.role }}>
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 18 }}
          >
            <div style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--apex-navy)' }}>{c.value}</div>
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
      </div>
    </AppShell>
  )
}
