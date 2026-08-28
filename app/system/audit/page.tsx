import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\./g, ' — ')
}

export default async function AuditLogPage() {
  const user = await requirePermission('VIEW_AUDIT_LOG')
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Audit Log']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Audit Log</h1>
      <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16 }}>
        Most recent 200 administrative actions: user, role, venue, project, and settings changes.
      </p>

      <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['When', 'Actor', 'Action', 'Target'].map((h) => (
                <th key={h} style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '14px', fontSize: 12, color: 'var(--apex-muted)', textAlign: 'center' }}>
                  No actions recorded yet.
                </td>
              </tr>
            )}
            {entries.map((e, i) => (
              <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)', whiteSpace: 'nowrap' }}>
                  {e.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>{e.actorName}</td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>{formatAction(e.action)}</td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{e.targetLabel ?? e.targetId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
