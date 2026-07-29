'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, BookOpen, Users, Settings, LogOut } from 'lucide-react'

type NavUser = {
  name: string
  role: 'ADMIN' | 'STAFF'
}

const NAV: {
  key: string
  href: string
  label: string
  Icon: typeof LayoutDashboard
  adminOnly?: boolean
}[] = [
  { key: 'dashboard', href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'logbook', href: '/logbook', label: 'LogBook', Icon: BookOpen },
  { key: 'staff', href: '/staff', label: 'Staff', Icon: Users },
  { key: 'system', href: '/system', label: 'System', Icon: Settings, adminOnly: true },
]

const SUB: Record<string, [string, string][]> = {
  logbook: [
    ['/logbook', 'Events'],
    ['/logbook/new', 'New Event'],
    ['/logbook/find', 'Find Event'],
  ],
  staff: [
    ['/staff', 'Directory'],
    ['/staff/timesheet', 'Timesheet'],
  ],
  system: [
    ['/system/venue', 'Venue'],
    ['/system/project', 'Project'],
  ],
}

const SECTION_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/logbook': 'Events',
  '/logbook/new': 'New Event',
  '/logbook/find': 'Find Event',
  '/staff': 'Staff Directory',
  '/staff/timesheet': 'Timesheet',
  '/system/venue': 'Venue',
  '/system/project': 'Project',
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!now) return null
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{dateStr} &nbsp;{timeStr}</span>
}

function Header({ user, pathname }: { user: NavUser; pathname: string }) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 200,
        backgroundColor: 'var(--apex-navy)',
        borderBottom: '3px solid var(--apex-accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--apex-accent)', letterSpacing: '-0.5px' }}>
          APEX
        </span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 20 }}>|</span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>
          {SECTION_TITLES[pathname] ?? 'APEX'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Clock />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '4px 12px',
            borderRadius: 20,
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--apex-green)' }} />
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500 }}>{user.name}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--apex-accent)',
              backgroundColor: 'rgba(224,123,57,0.2)',
              padding: '1px 6px',
              borderRadius: 4,
            }}
          >
            {user.role}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sign out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  )
}

function Sidebar({ user, pathname }: { user: NavUser; pathname: string }) {
  const activeMain = NAV.find((n) => pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href)))
  const subItems = activeMain ? SUB[activeMain.key] : undefined

  return (
    <aside
      style={{
        position: 'fixed',
        top: 60,
        left: 0,
        bottom: 0,
        width: 200,
        zIndex: 100,
        backgroundColor: 'var(--apex-navy)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 8,
        overflowY: 'auto',
      }}
    >
      {NAV.filter((n) => !n.adminOnly || user.role === 'ADMIN').map(({ key, href, label, Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        const style: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '11px 18px',
          border: 'none',
          textDecoration: 'none',
          cursor: 'pointer',
          backgroundColor: active ? 'rgba(224,123,57,0.14)' : 'transparent',
          borderLeft: active ? '3px solid var(--apex-accent)' : '3px solid transparent',
          color: active ? 'var(--apex-accent)' : 'rgba(255,255,255,0.62)',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          width: '100%',
        }
        return (
          <Link key={key} href={href} style={style}>
            <Icon size={16} /> {label}
          </Link>
        )
      })}
      {subItems && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {subItems.map(([href, label]) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'block',
                  padding: '9px 18px 9px 44px',
                  textDecoration: 'none',
                  fontSize: 12,
                  color: active ? 'var(--apex-accent)' : 'rgba(255,255,255,0.5)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </aside>
  )
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16 }}>
      {['APEX', ...items].join(' > ')}
    </div>
  )
}

export function AppShell({ user, children }: { user: NavUser; children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div>
      <Header user={user} pathname={pathname} />
      <Sidebar user={user} pathname={pathname} />
      <main style={{ marginLeft: 200, paddingTop: 60, minHeight: '100vh' }}>
        <div style={{ padding: 24 }}>{children}</div>
      </main>
    </div>
  )
}
