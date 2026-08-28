'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const TIMESHEET_TABS = [
  { href: '/staff/timesheet', label: 'Attendance' },
  { href: '/staff/timesheet/mine', label: 'My Timesheet' },
]

export const LEAVE_TABS = [
  { href: '/staff/leave', label: 'Applications' },
  { href: '/staff/leave/calendar', label: 'Calendar' },
]

export const ACTIVITIES_TABS = [
  { href: '/staff/activities', label: 'Current' },
  { href: '/staff/activities/summary', label: 'Summary' },
]

export function NavTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--apex-border)' }}>
      {tabs.map((t) => {
        const isActive = pathname === t.href
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
