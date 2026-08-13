import Link from 'next/link'

const TABS = [
  { href: '/staff/leave', label: 'Applications' },
  { href: '/staff/leave/calendar', label: 'Calendar' },
]

export function LeaveTabs({ active }: { active: 'applications' | 'calendar' }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--apex-border)' }}>
      {TABS.map((t, i) => {
        const isActive = (active === 'applications' && i === 0) || (active === 'calendar' && i === 1)
        return (
          <Link
            key={t.href}
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
