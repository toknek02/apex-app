import { Fragment } from 'react'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { RefreshButton } from '@/components/staff/refresh-button'
import { ActivitiesTabs } from '@/components/staff/activities-tabs'

export default async function ActivitiesPage() {
  const user = await requireUser()
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  // Same tiering as the Dashboard and Timesheet pages: company-wide activity
  // is only meaningful to someone with oversight responsibility. And same
  // private-event rule as /logbook — without it, this page was showing
  // private event titles/remarks to anyone logged in, regardless of
  // EDIT_ANY_EVENT.
  const isPrivileged =
    hasPermission(user, 'VIEW_TIMESHEET_REPORTS') ||
    hasPermission(user, 'MANAGE_PROJECTS') ||
    hasPermission(user, 'MANAGE_USERS')
  const canSeeAllPrivate = hasPermission(user, 'EDIT_ANY_EVENT')

  const [allStaff, openRecords, todaysAttendance] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: [{ department: 'asc' }, { name: 'asc' }] }),
    prisma.signInRecord.findMany({ where: { signOutAt: null }, orderBy: { signInAt: 'asc' } }),
    prisma.eventAttendee.findMany({
      where: {
        event: {
          date: { gte: startOfDay, lte: endOfDay },
          ...(canSeeAllPrivate ? {} : { OR: [{ private: false }, { createdById: user.id }, { attendees: { some: { userId: user.id } } }] }),
        },
      },
      include: { event: { include: { project: true } } },
    }),
  ])

  const staff = isPrivileged ? allStaff : allStaff.filter((s) => s.id === user.id)
  const openByUser = new Map(openRecords.map((r) => [r.userId, r]))
  const plannerByUser = new Map(
    todaysAttendance
      .filter((a) => {
        const start = a.event.date.getTime()
        const end = start + (a.event.durationMins ?? 60) * 60 * 1000
        const t = now.getTime()
        return t >= start && t <= end
      })
      .map((a) => [a.userId, a.event])
  )

  const grouped = new Map<string, typeof staff>()
  for (const s of staff) {
    const dept = s.department ?? 'UNASSIGNED'
    if (!grouped.has(dept)) grouped.set(dept, [])
    grouped.get(dept)!.push(s)
  }

  const title = `ACTIVITY SUMMARY @ ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} on ${now.toLocaleDateString('en-GB')}`

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Activities']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700 }}>{title}</h1>
        <RefreshButton />
      </div>

      <ActivitiesTabs active="current" />

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Staff', 'Event', 'Project', 'Since', 'Remarks'].map((h) => (
                <th key={h} style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...grouped.entries()].map(([dept, members]) => (
              <Fragment key={dept}>
                <tr>
                  <td colSpan={5} style={{ padding: '6px 14px', backgroundColor: 'var(--apex-dept-bg)', fontSize: 11, fontWeight: 700, color: 'var(--apex-tbl-hdr)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Department: {dept}
                  </td>
                </tr>
                {members.map((m, i) => {
                  const open = openByUser.get(m.id)
                  const plannerEvent = plannerByUser.get(m.id)
                  const eventLabel = open ? 'Sign-in' : plannerEvent ? 'Planner' : null
                  const since = open?.signInAt ?? plannerEvent?.date
                  const project = plannerEvent?.project ? `${plannerEvent.project.code} - ${plannerEvent.project.shortName}` : 'nil'
                  const remarks = plannerEvent?.remarks ?? plannerEvent?.title ?? 'nil'

                  return (
                    <tr key={m.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, fontStyle: eventLabel ? 'normal' : 'italic', color: eventLabel ? 'var(--apex-text)' : 'var(--apex-muted)' }}>
                        {m.name}
                      </td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: eventLabel ? 'var(--apex-text)' : 'var(--apex-muted)' }}>
                        {eventLabel ?? 'Not logged in!'}
                      </td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{eventLabel ? project : ''}</td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>
                        {since ? since.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                      </td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{eventLabel ? remarks : ''}</td>
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
