import Link from 'next/link'
import { Building, Users, Settings } from 'lucide-react'
import { requireAdmin } from '@/lib/rbac'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'

const CARDS = [
  { label: 'Staff', Icon: Users, href: '/staff' },
  { label: 'Venue', Icon: Building, href: '/system/venue' },
  { label: 'Project', Icon: Settings, href: '/system/project' },
]

export default async function SystemAdminPage() {
  const user = await requireAdmin()

  return (
    <AppShell user={{ name: user.name ?? '', role: user.role }}>
      <Breadcrumb items={['System']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        System Admin : ADMINISTRATOR
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 620 }}>
        {CARDS.map(({ label, Icon, href }) => (
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
