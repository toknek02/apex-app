import { Fragment } from 'react'
import { Pencil } from 'lucide-react'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { SignInButton } from '@/components/staff/sign-in-button'
import { UserModal } from '@/components/staff/user-modal'

export default async function StaffPage() {
  const user = await requireUser()
  const canManageUsers = hasPermission(user, 'MANAGE_USERS')
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const [staff, roles, openRecords, todaysAttendance] = await Promise.all([
    prisma.user.findMany({
      where: canManageUsers ? {} : { isActive: true },
      include: { role: true },
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
    }),
    canManageUsers ? prisma.role.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
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
  const columns = canManageUsers
    ? ['Name', 'Designation', 'Role', 'Status', 'Sign-in', 'Actions']
    : ['Name', 'Designation', 'Role', 'Status', 'Sign-in']

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
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

      {canManageUsers && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <UserModal
            roles={roles}
            trigger={
              <span style={{ padding: '8px 16px', backgroundColor: 'var(--apex-accent)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                New Staff
              </span>
            }
          />
        </div>
      )}

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {columns.map((h) => (
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
                  <td colSpan={columns.length} style={{ padding: '6px 14px', backgroundColor: 'var(--apex-dept-bg)', fontSize: 11, fontWeight: 700, color: 'var(--apex-tbl-hdr)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Department: {dept}
                  </td>
                </tr>
                {members.map((m, i) => {
                  const open = openByUser.get(m.id)
                  const atPlanner = atPlannerUserIds.has(m.id)
                  const statusLabel = !m.isActive ? 'Inactive' : open ? 'Active' : atPlanner ? 'At Planner' : 'Not logged in'
                  const statusColor = !m.isActive
                    ? 'var(--apex-red)'
                    : open
                      ? 'var(--apex-green)'
                      : atPlanner
                        ? 'var(--apex-accent)'
                        : 'var(--apex-muted)'
                  const muted = statusLabel === 'Not logged in' || statusLabel === 'Inactive'
                  return (
                    <tr key={m.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff', opacity: m.isActive ? 1 : 0.6 }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, fontStyle: muted ? 'italic' : 'normal', color: muted ? 'var(--apex-muted)' : 'var(--apex-text)' }}>
                        {m.name}
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{m.designation ?? '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{m.role.name}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: statusColor, fontWeight: 600 }}>
                          {open && <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: statusColor }} />}
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 12 }}>
                        {open ? open.signInAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
                      </td>
                      {canManageUsers && (
                        <td style={{ padding: '9px 14px', fontSize: 12 }}>
                          <UserModal
                            user={{ id: m.id, name: m.name, email: m.email, department: m.department, designation: m.designation, roleId: m.roleId, isActive: m.isActive }}
                            roles={roles}
                            trigger={<Pencil size={14} color="var(--apex-accent)" />}
                          />
                        </td>
                      )}
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
