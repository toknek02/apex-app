import Link from 'next/link'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { LeaveApprovalActions } from '@/components/staff/leave-approval-actions'
import { NavTabs, LEAVE_TABS } from '@/components/staff/nav-tabs'
import { pendingApprovalScope } from '@/lib/leave-approval'

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dateRangeLabel(start: Date, end: Date, dayPortion: string) {
  const range = start.getTime() === end.getTime() ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`
  return dayPortion === 'AM' || dayPortion === 'PM' ? `${range} (${dayPortion} half-day)` : range
}

function projectLabel(project: { code: string; shortName: string } | null) {
  return project ? `${project.code} — ${project.shortName}` : '—'
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_ARCHITECT: { label: 'Pending — Architect', color: 'var(--apex-accent)', bg: 'var(--apex-accent-lt)' },
  PENDING_DIRECTOR: { label: 'Pending — Director', color: 'var(--apex-accent)', bg: 'var(--apex-accent-lt)' },
  APPROVED: { label: 'Approved', color: 'var(--apex-green)', bg: 'var(--apex-green-lt)' },
  REJECTED: { label: 'Rejected', color: 'var(--apex-red)', bg: 'var(--apex-red-lt)' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'var(--apex-muted)', bg: 'var(--apex-row-alt)' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: meta.color, backgroundColor: meta.bg }}>
      {meta.label}
    </span>
  )
}

const thStyle: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', borderRight: '1px solid var(--apex-border)' }
const tdStyle: React.CSSProperties = { padding: '9px 14px', fontSize: 12, borderRight: '1px solid var(--apex-border)' }

export default async function LeavePage() {
  const user = await requireUser()
  const isHR = hasPermission(user, 'RECEIVE_HR_LEAVE_NOTIFICATIONS')

  const projectSelect = { project: { select: { code: true, shortName: true } } } as const

  const [myApplications, approvalScope] = await Promise.all([
    prisma.leaveApplication.findMany({ where: { userId: user.id }, include: projectSelect, orderBy: { createdAt: 'desc' } }),
    pendingApprovalScope(user),
  ])

  const showApprovalSection = approvalScope.hasAuthority

  const [pendingForApproval, hrApplications] = await Promise.all([
    approvalScope.where
      ? prisma.leaveApplication.findMany({
          where: approvalScope.where,
          include: { user: { select: { id: true, name: true, department: true } }, ...projectSelect },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),
    isHR
      ? prisma.leaveApplication.findMany({
          include: { user: { select: { id: true, name: true, department: true } }, ...projectSelect },
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

      <NavTabs tabs={LEAVE_TABS} />

      {showApprovalSection && (
        <>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pending My Approval</h2>
          <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
                  {['Staff', 'Leave Type', 'Project', 'Dates', 'Stage', 'Reason', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingForApproval.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--apex-muted)', fontStyle: 'italic' }}>
                      Nothing pending your approval.
                    </td>
                  </tr>
                ) : (
                  pendingForApproval.map((a, i) => (
                    <tr key={a.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{a.user.name}</td>
                      <td style={tdStyle}>{a.leaveType}</td>
                      <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{projectLabel(a.project)}</td>
                      <td style={tdStyle}>{dateRangeLabel(a.startDate, a.endDate, a.dayPortion)}</td>
                      <td style={tdStyle}>{a.status === 'PENDING_ARCHITECT' ? 'Architect Review' : 'Director Review'}</td>
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
          <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto', marginBottom: 28, maxHeight: 360 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
                  {['Staff', 'Leave Type', 'Project', 'Dates', 'Status', 'Reviewed By'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hrApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--apex-muted)', fontStyle: 'italic' }}>
                      No leave applications yet.
                    </td>
                  </tr>
                ) : (
                  hrApplications.map((a, i) => (
                    <tr key={a.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{a.user.name}</td>
                      <td style={tdStyle}>{a.leaveType}</td>
                      <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{projectLabel(a.project)}</td>
                      <td style={tdStyle}>{dateRangeLabel(a.startDate, a.endDate, a.dayPortion)}</td>
                      <td style={tdStyle}><StatusBadge status={a.status} /></td>
                      <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{a.reviewedByName || (a.architectApprovedByName ? `${a.architectApprovedByName} (architect)` : '—')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>My Applications</h2>
      <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Leave Type', 'Project', 'Dates', 'Reason', 'Status', 'Remarks'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myApplications.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--apex-muted)', fontStyle: 'italic' }}>
                  You haven't applied for leave yet.
                </td>
              </tr>
            ) : (
              myApplications.map((a, i) => (
                <tr key={a.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                  <td style={tdStyle}>{a.leaveType}</td>
                  <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{projectLabel(a.project)}</td>
                  <td style={tdStyle}>{dateRangeLabel(a.startDate, a.endDate, a.dayPortion)}</td>
                  <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{a.reason || '—'}</td>
                  <td style={tdStyle}><StatusBadge status={a.status} /></td>
                  <td style={{ ...tdStyle, color: 'var(--apex-muted)' }}>{a.reviewRemarks || a.architectRemarks || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
