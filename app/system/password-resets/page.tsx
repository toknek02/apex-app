import { Pencil } from 'lucide-react'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { UserModal } from '@/components/staff/user-modal'
import { PasswordResetActions } from '@/components/system/password-reset-actions'

export default async function PasswordResetsPage() {
  const user = await requirePermission('MANAGE_USERS')

  const [pending, roles] = await Promise.all([
    prisma.passwordResetRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
  ])

  const userIds = pending.map((r) => r.userId).filter((id): id is string => Boolean(id))
  const matchedUsers = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } } })
    : []
  const userById = new Map(matchedUsers.map((u) => [u.id, u]))

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Password Resets']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Password Resets</h1>
      <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16 }}>
        Requests submitted via the login page&apos;s &quot;Forgot password?&quot; link. Reset the user&apos;s password from Staff, then mark the request resolved.
      </p>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Requested', 'Email', 'Matched User', 'Reset', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '14px', fontSize: 12, color: 'var(--apex-muted)', textAlign: 'center' }}>
                  No pending requests.
                </td>
              </tr>
            )}
            {pending.map((r, i) => {
              const matched = r.userId ? userById.get(r.userId) : undefined
              return (
                <tr key={r.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)', whiteSpace: 'nowrap' }}>
                    {r.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>{r.email}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>
                    {matched ? matched.name : <span style={{ color: 'var(--apex-red)' }}>No matching account</span>}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>
                    {matched && (
                      <UserModal
                        user={{ id: matched.id, name: matched.name, email: matched.email, department: matched.department, designation: matched.designation, roleId: matched.roleId, isActive: matched.isActive }}
                        roles={roles}
                        trigger={
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--apex-accent)', fontWeight: 600 }}>
                            <Pencil size={13} /> Reset
                          </span>
                        }
                      />
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>
                    <PasswordResetActions requestId={r.id} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
