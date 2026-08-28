import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'

export default async function ErrorLogPage() {
  const user = await requirePermission('VIEW_ERROR_LOG')
  const entries = await prisma.errorLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Error Log']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Error Log</h1>
      <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16 }}>
        Most recent 200 server and browser errors captured automatically.
      </p>

      <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['When', 'Source', 'Message', 'Page', 'User'].map((h) => (
                <th key={h} style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '14px', fontSize: 12, color: 'var(--apex-muted)', textAlign: 'center' }}>
                  No errors recorded yet.
                </td>
              </tr>
            )}
            {entries.map((e, i) => (
              <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)', whiteSpace: 'nowrap' }}>
                  {e.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: e.source === 'server' ? 'rgba(224,123,57,0.15)' : 'rgba(59,130,246,0.15)',
                      color: e.source === 'server' ? 'var(--apex-accent)' : '#3b82f6',
                    }}
                  >
                    {e.source.toUpperCase()}
                  </span>
                </td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.message}>
                  {e.message}
                </td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.url ?? ''}>
                  {e.url ?? '—'}
                </td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{e.userName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
