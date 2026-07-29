import { Pencil, Plus } from 'lucide-react'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS } from '@/lib/permissions'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { RoleModal } from '@/components/system/role-modal'
import { DeleteRoleButton } from '@/components/system/delete-role-button'

export default async function RolesPage() {
  const user = await requirePermission('MANAGE_ROLES')
  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } }, _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Roles']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Roles</h1>
        <RoleModal
          allPermissions={PERMISSIONS}
          trigger={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: 'var(--apex-accent)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              <Plus size={14} /> New Role
            </span>
          }
        />
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Role', 'Description', 'Permissions', 'Users', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r, i) => (
              <tr key={r.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600 }}>
                  {r.name}
                  {r.isSystem && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: 'var(--apex-accent)', backgroundColor: 'rgba(224,123,57,0.15)', padding: '1px 6px', borderRadius: 4 }}>
                      PROTECTED
                    </span>
                  )}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{r.description ?? '—'}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>
                  {r.rolePermissions.length === 0 ? 'None' : r.rolePermissions.map((rp) => rp.permission.label).join(', ')}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{r._count.users}</td>
                <td style={{ padding: '9px 14px', fontSize: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <RoleModal role={r} allPermissions={PERMISSIONS} trigger={<Pencil size={14} color="var(--apex-accent)" />} />
                    <DeleteRoleButton roleId={r.id} disabled={r.isSystem || r._count.users > 0} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
