import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building, Users, ShieldCheck, Settings, History, AlertTriangle, KeyRound } from 'lucide-react'
import { requireUser, hasPermission } from '@/lib/rbac'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import type { PermissionCode } from '@/lib/permissions'

const CARDS: { label: string; Icon: typeof Users; href: string; requires: PermissionCode }[] = [
  { label: 'Staff', Icon: Users, href: '/staff', requires: 'MANAGE_USERS' },
  { label: 'Venue', Icon: Building, href: '/system/venue', requires: 'MANAGE_VENUES' },
  { label: 'Roles', Icon: ShieldCheck, href: '/system/roles', requires: 'MANAGE_ROLES' },
  { label: 'Settings', Icon: Settings, href: '/system/settings', requires: 'MANAGE_SETTINGS' },
  { label: 'Password Resets', Icon: KeyRound, href: '/system/password-resets', requires: 'MANAGE_USERS' },
  { label: 'Audit Log', Icon: History, href: '/system/audit', requires: 'VIEW_AUDIT_LOG' },
  { label: 'Error Log', Icon: AlertTriangle, href: '/system/errors', requires: 'VIEW_ERROR_LOG' },
]

export default async function SystemAdminPage() {
  const user = await requireUser()
  const cards = CARDS.filter((c) => hasPermission(user, c.requires))
  if (cards.length === 0) redirect('/')

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        System Admin : {user.roleName.toUpperCase()}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 620 }}>
        {cards.map(({ label, Icon, href }) => (
          <Link
            key={label}
            href={href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              padding: '28px 12px', backgroundColor: '#fff', border: '1px solid var(--apex-border)',
              borderRadius: 10, textDecoration: 'none', color: 'var(--apex-text)', fontSize: 12, fontWeight: 600,
            }}
          >
            <Icon size={28} color="var(--apex-accent)" />
            {label}
          </Link>
        ))}
      </div>
    </AppShell>
  )
}
