import Link from 'next/link'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { LeaveApprovalActions } from '@/components/staff/leave-approval-actions'
import { LeaveTabs } from '@/components/staff/leave-tabs'

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dateRangeLabel(start: Date, end: Date, dayPortion: string) {
  const range = start.getTime() === end.getTime() ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`
  return dayPortion === 'AM' || dayPortion === 'PM' ? `${range} (${dayPortion} half-day)` : range
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'APPROVED' ? 'var(--apex-green)' : status === 'REJECTED' ? 'var(--apex-red)' : 'var(--apex-accent)'
  const bg = status === 'APPROVED' ? 'var(--apex-green-lt)' : status === 'REJECTED' ? 'var(--apex-red-lt)' : 'var(--apex-accent-lt)'
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color, backgroundColor: bg }}>
      {status}
    </span>
  )
}

const thStyle: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }
const tdStyle: React.CSSProperties = { padding: '9px 14px', fontSize: 12 }

export default async function LeavePage() {
  const user = await requireUser()
  const isHR = hasPermission(user, 'RECEIVE_HR_LEAVE_NOTIFICATIONS')

  const [myApplications, directedGroups] = await Promise.all([
    prisma.leaveApplication.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.leaveGroup.findMany({ where: { directorId: user.id }, select: { id: true, name: true } }),
  ])

  const groupIds = directedGroups.map((g) => g.id)
  const isDirector = groupIds.length > 0
  // MANAGE_LEAVE_GROUPS is the approval override for groups whose director
  // is unavailable — extend that same override to applications from
  // ungrouped staff, which otherwise have no director to route to and
  // would sit PENDING forever with no one able to act on them.
  const canApproveOrphaned = hasPermission(user, 'MANAGE_LEAVE_GROUPS')
  const showApprovalSection = isDirector || canApproveOrphaned

  const [pendingForApproval, hrApplications] = await Promise.all([
    showApprovalSection
      ? prisma.leaveApplication.findMany({
          where: {
            status: 'PENDING',
            OR: [
              ...(isDirector ? [{ user: { leaveGroupId: { in: groupIds } } }] : []),
              ...(canApproveOrphaned ? [{ user: { leaveGroupId: null } }] : []),
            ],
          },
          include: { user: { select: { id: true, name: true, department: true } } },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),
    isHR
      ? prisma.leaveApplication.findMany({
          include: { user: { select: { id: true, name: true, department: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : Promise.resolve([]),
  ])

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Leave']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Leave</h1>
        <Link href="/staff/leave/new" style={{ padding: '8px 16px', backgroundColor: 'var(--apex-navy)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          + Apply for Leave
        </Link>
      </div>

      <LeaveTabs active="applications" />

      {showApprovalSection && (
        <>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pending My Approval</h2>
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
                  {['Staff', 'Leave Type', 'Dates', 'Reason', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingForApproval.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--apex-muted)', fontStyle: 'italic' }}>
                      Nothing pending your approval.
                    </td>
                  </tr>
                ) : (
                  pendingForApproval.map((a, i) => (
                    <tr key={a.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{a.user.name}</td>
                      <td style={tdStyle}>{a.leaveType}</td>
                      <td style={tdStyle}>{dateRangeLabel(a.startDate, a.endDate, a.dayPortion)}</td>
                      <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{a.reason || '—'}</td>
                      <td style={tdStyle}>
                        <LeaveApprovalActions applicationId={a.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isHR && (
        <>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>All Applications (HR view)</h2>
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto', marginBottom: 28, maxHeight: 360 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
                  {['Staff', 'Leave Type', 'Dates', 'Status', 'Reviewed By'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hrApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--apex-muted)', fontStyle: 'italic' }}>
                      No leave applications yet.
                    </td>
                  </tr>
                ) : (
                  hrApplications.map((a, i) => (
                    <tr key={a.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{a.user.name}</td>
                      <td style={tdStyle}>{a.leaveType}</td>
                      <td style={tdStyle}>{dateRangeLabel(a.startDate, a.endDate, a.dayPortion)}</td>
                      <td style={tdStyle}><StatusBadge status={a.status} /></td>
                      <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{a.reviewedByName || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>My Applications</h2>
      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Leave Type', 'Dates', 'Reason', 'Status', 'Remarks'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myApplications.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--apex-muted)', fontStyle: 'italic' }}>
                  You haven't applied for leave yet.
                </td>
              </tr>
            ) : (
              myApplications.map((a, i) => (
                <tr key={a.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                  <td style={tdStyle}>{a.leaveType}</td>
                  <td style={tdStyle}>{dateRangeLabel(a.startDate, a.endDate, a.dayPortion)}</td>
                  <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{a.reason || '—'}</td>
                  <td style={tdStyle}><StatusBadge status={a.status} /></td>
                  <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{a.reviewRemarks || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
