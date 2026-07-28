import { Fragment } from 'react'
import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { SignInButton } from '@/components/staff/sign-in-button'
import { NewStaffModal } from '@/components/staff/new-staff-modal'

export default async function StaffPage() {
  const user = await requireUser()
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const [staff, openRecords, todaysAttendance] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: [{ department: 'asc' }, { name: 'asc' }] }),
    prisma.signInRecord.findMany({ where: { signOutAt: null } }),
    prisma.eventAttendee.findMany({
      where: { event: { date: { gte: startOfDay, lte: endOfDay } } },
      include: { event: true },
    }),
  ])

  const openByUser = new Map(openRecords.map((r) => [r.userId, r]))
  const atPlannerUserIds = new Set(
    todaysAttendance
      .filter((a) => {
        const start = a.event.date.getTime()
        const end = start + (a.event.durationMins ?? 60) * 60 * 1000
        const t = now.getTime()
        return t >= start && t <= end
      })
      .map((a) => a.userId)
  )

  const grouped = new Map<string, typeof staff>()
  for (const s of staff) {
    const dept = s.department ?? 'UNASSIGNED'
    if (!grouped.has(dept)) grouped.set(dept, [])
    grouped.get(dept)!.push(s)
  }

  const myOpenRecord = openByUser.get(user.id)

  return (
    <AppShell user={{ name: user.name ?? '', role: user.role }}>
      <Breadcrumb items={['Staff', 'Directory']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Staff Directory</h1>

      <SignInButton
        signedIn={Boolean(myOpenRecord)}
        signInAt={
          myOpenRecord
            ? myOpenRecord.signInAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            : null
        }
      />

      {user.role === 'ADMIN' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <NewStaffModal />
        </div>
      )}

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Name', 'Designation', 'Status', 'Sign-in'].map((h) => (
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
                  <td colSpan={4} style={{ padding: '6px 14px', backgroundColor: 'var(--apex-dept-bg)', fontSize: 11, fontWeight: 700, color: 'var(--apex-tbl-hdr)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Department: {dept}
                  </td>
                </tr>
                {members.map((m, i) => {
                  const open = openByUser.get(m.id)
                  const atPlanner = atPlannerUserIds.has(m.id)
                  const statusLabel = open ? 'Active' : atPlanner ? 'At Planner' : 'Not logged in'
                  const statusColor = open ? 'var(--apex-green)' : atPlanner ? 'var(--apex-accent)' : 'var(--apex-muted)'
                  return (
                    <tr key={m.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontStyle: statusLabel === 'Not logged in' ? 'italic' : 'normal', color: statusLabel === 'Not logged in' ? 'var(--apex-muted)' : 'var(--apex-text)' }}>
                        {m.name}
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{m.designation ?? '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: statusColor, fontWeight: 600 }}>
                          {open && <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: statusColor }} />}
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 12 }}>
                        {open ? open.signInAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
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
