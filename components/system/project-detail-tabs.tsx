import Link from 'next/link'

export function ProjectDetailTabs({ projectId, active }: { projectId: string; active: 'details' | 'cost' | 'team' }) {
  const tabs = [
    { key: 'details', href: `/staff/project/${projectId}`, label: 'Details' },
    { key: 'team', href: `/staff/project/${projectId}?tab=team`, label: 'Team' },
    { key: 'cost', href: `/staff/project/${projectId}?tab=cost`, label: 'Project Cost' },
  ] as const

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--apex-border)', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <Link
            key={t.key}
            href={t.href}
            style={{
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              color: isActive ? 'var(--apex-accent)' : 'var(--apex-muted)',
              borderBottom: isActive ? '2px solid var(--apex-accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
