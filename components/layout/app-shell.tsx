'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, BookOpen, Users, Settings, Megaphone, Bell, LogOut, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'
import type { PermissionCode } from '@/lib/permissions'
import { SignInStatusPill } from '@/components/layout/sign-in-status-pill'
import { NotificationBell } from '@/components/layout/notification-bell'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { Logo } from '@/components/logo'

type NavUser = {
  name: string
  roleName: string
  permissions: string[]
}

const RADIUS = 'var(--apex-radius-sm)'

const NAV: {
  key: string
  href: string
  label: string
  Icon: typeof LayoutDashboard
  requiresAnyOf?: PermissionCode[]
}[] = [
  { key: 'dashboard', href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'logbook', href: '/logbook', label: 'LogBook', Icon: BookOpen },
  { key: 'staff', href: '/staff', label: 'Staff', Icon: Users },
  { key: 'announcements', href: '/announcements', label: 'Announcements', Icon: Megaphone },
  { key: 'notifications', href: '/notifications', label: 'Notifications', Icon: Bell },
  { key: 'system', href: '/system', label: 'System', Icon: Settings, requiresAnyOf: ['MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_VENUES', 'MANAGE_PROJECTS', 'MANAGE_SETTINGS', 'VIEW_AUDIT_LOG', 'VIEW_ERROR_LOG', 'MANAGE_LEAVE_GROUPS', 'MANAGE_PUBLIC_HOLIDAYS'] },
]

const SUB: Record<string, { href: string; label: string; requires?: PermissionCode }[]> = {
  logbook: [
    { href: '/logbook', label: 'Events' },
    { href: '/logbook/new', label: 'New Event' },
    { href: '/logbook/find', label: 'Find Event' },
  ],
  staff: [
    { href: '/staff', label: 'Directory' },
    { href: '/staff/timesheet', label: 'Timesheet' },
    { href: '/staff/activities', label: 'Activities' },
    { href: '/staff/leave', label: 'Leave' },
    { href: '/staff/project', label: 'Project', requires: 'MANAGE_PROJECTS' },
  ],
  system: [
    { href: '/system/venue', label: 'Venue' },
    { href: '/system/roles', label: 'Roles' },
    { href: '/system/leave-groups', label: 'Groups', requires: 'MANAGE_LEAVE_GROUPS' },
    { href: '/system/public-holidays', label: 'Public Holidays', requires: 'MANAGE_PUBLIC_HOLIDAYS' },
    { href: '/system/settings', label: 'Settings', requires: 'MANAGE_SETTINGS' },
    { href: '/system/password-resets', label: 'Password Resets', requires: 'MANAGE_USERS' },
    { href: '/system/audit', label: 'Audit Log', requires: 'VIEW_AUDIT_LOG' },
    { href: '/system/errors', label: 'Error Log', requires: 'VIEW_ERROR_LOG' },
  ],
}

const SECTION_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/logbook': 'Events',
  '/logbook/new': 'New Event',
  '/logbook/find': 'Find Event',
  '/staff': 'Staff Directory',
  '/staff/timesheet': 'Timesheet',
  '/staff/activities': 'Activities',
  '/staff/activities/summary': 'Activities Summary',
  '/staff/leave': 'Leave',
  '/staff/leave/calendar': 'Leave Calendar',
  '/staff/project': 'Project',
  '/staff/project/archive': 'Project Archive',
  '/announcements': 'Announcements',
  '/announcements/new': 'New Announcement',
  '/notifications': 'Notifications',
  '/profile': 'My Profile',
  '/system/venue': 'Venue',
  '/system/roles': 'Roles',
  '/system/leave-groups': 'Groups',
  '/system/public-holidays': 'Public Holidays',
}

const HEADER_H = 56
const SIDEBAR_EXPANDED_WIDTH = 220
const SIDEBAR_COLLAPSED_WIDTH = 64

const pillBadge: React.CSSProperties = {
  minWidth: 17,
  height: 17,
  padding: '0 5px',
  borderRadius: 999,
  background: 'var(--apex-red)',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const dotBadge: React.CSSProperties = {
  position: 'absolute',
  top: -5,
  right: -7,
  minWidth: 13,
  height: 13,
  padding: '0 2px',
  borderRadius: 99,
  background: 'var(--apex-red)',
  color: '#fff',
  fontSize: 8,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!now) return null
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return (
    <span style={{ color: 'var(--apex-muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
      {dateStr}&nbsp;&nbsp;{timeStr}
    </span>
  )
}

function Header({
  user,
  pathname,
  isMobile,
  mobileOpen,
  onMobileToggle,
  notifications,
}: {
  user: NavUser
  pathname: string
  isMobile: boolean
  mobileOpen: boolean
  onMobileToggle: () => void
  notifications: ReturnType<typeof useNotifications>
}) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_H,
        zIndex: 200,
        background: 'var(--apex-surface)',
        borderBottom: '1px solid var(--apex-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobile && (
          <button
            onClick={onMobileToggle}
            title={mobileOpen ? 'Close menu' : 'Open menu'}
            className="apex-btn apex-btn-ghost apex-btn-sm"
            style={{ minHeight: 32, padding: 6 }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Logo size={22} />
          <span
            style={{
              fontFamily: 'var(--apex-font-display)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--apex-text)',
              letterSpacing: '-0.02em',
            }}
          >
            MAA-OA
          </span>
        </Link>
        {!isMobile && (
          <>
            <span style={{ color: 'var(--apex-border-strong)' }}>/</span>
            <span style={{ color: 'var(--apex-muted)', fontSize: 13, fontWeight: 500 }}>
              {SECTION_TITLES[pathname] ?? 'MAA-OA'}
            </span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {!isMobile && <Clock />}
        <SignInStatusPill isMobile={isMobile} />
        <NotificationBell
          notifications={notifications.notifications}
          unreadCount={notifications.unreadCount}
          markRead={notifications.markRead}
          markAllRead={notifications.markAllRead}
        />
        <Link
          href="/profile"
          title="My Profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'var(--apex-surface-2)',
            border: '1px solid var(--apex-border)',
            padding: '4px 10px 4px 8px',
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--apex-green)' }} />
          <span style={{ color: 'var(--apex-text)', fontSize: 12, fontWeight: 600 }}>{user.name}</span>
          {!isMobile && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--apex-accent-hover)',
                background: 'var(--apex-accent-lt)',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              {user.roleName}
            </span>
          )}
        </Link>
        <button
          onClick={async () => {
            if (!confirm('Sign out of MAA-OA?')) return
            // Skip next-auth's server-computed redirect URL: with the dev server bound to
            // 0.0.0.0, that can echo back the bind address itself instead of the browser's
            // actual origin. A plain relative navigation always resolves correctly.
            await signOut({ redirect: false })
            window.location.href = '/login'
          }}
          title="Sign out"
          className="apex-btn apex-btn-ghost apex-btn-sm"
          style={{ minHeight: 32, padding: 6, color: 'var(--apex-muted)' }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}

function Sidebar({
  user,
  pathname,
  collapsed,
  onToggle,
  isMobile,
  mobileOpen,
  onNavigate,
  navBadges,
}: {
  user: NavUser
  pathname: string
  collapsed: boolean
  onToggle: () => void
  isMobile: boolean
  mobileOpen: boolean
  onNavigate: () => void
  navBadges: Record<string, number>
}) {
  const effectiveCollapsed = isMobile ? false : collapsed
  const activeMain = NAV.find((n) => pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href)))
  const subItems = !effectiveCollapsed && activeMain ? SUB[activeMain.key] : undefined

  return (
    <aside
      style={{
        position: 'fixed',
        top: HEADER_H,
        left: 0,
        bottom: 0,
        width: isMobile ? SIDEBAR_EXPANDED_WIDTH : effectiveCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        zIndex: 150,
        background: 'var(--apex-surface)',
        borderRight: '1px solid var(--apex-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: effectiveCollapsed ? '10px 8px' : '12px',
        gap: 2,
        overflowY: 'auto',
        overflowX: 'hidden',
        transform: isMobile ? `translateX(${mobileOpen ? '0' : '-100%'})` : 'none',
        transition: isMobile ? 'transform 0.2s ease' : 'width 0.18s ease',
      }}
    >
      {NAV.filter((n) => !n.requiresAnyOf || n.requiresAnyOf.some((code) => user.permissions.includes(code))).map(({ key, href, label, Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        const badgeCount = navBadges[key] ?? 0
        const style: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: effectiveCollapsed ? '10px 0' : '9px 12px',
          justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
          borderRadius: RADIUS,
          textDecoration: 'none',
          cursor: 'pointer',
          background: active ? 'var(--apex-accent-lt)' : 'transparent',
          color: active ? 'var(--apex-accent-hover)' : 'var(--apex-muted)',
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          whiteSpace: 'nowrap',
          position: 'relative',
          transition: 'background 0.12s ease, color 0.12s ease',
        }
        return (
          <Link
            key={key}
            href={href}
            style={style}
            title={effectiveCollapsed ? label : undefined}
            onClick={isMobile ? onNavigate : undefined}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = 'var(--apex-surface-2)'
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon size={17} />
              {badgeCount > 0 && effectiveCollapsed && <span style={dotBadge}>{badgeCount > 9 ? '9+' : badgeCount}</span>}
            </span>
            {!effectiveCollapsed && (
              <>
                {label}
                {badgeCount > 0 && <span style={{ ...pillBadge, marginLeft: 'auto' }}>{badgeCount > 9 ? '9+' : badgeCount}</span>}
              </>
            )}
          </Link>
        )
      })}

      {subItems && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--apex-border)' }}>
          {subItems.filter((item) => !item.requires || user.permissions.includes(item.requires)).map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={isMobile ? onNavigate : undefined}
                style={{
                  display: 'block',
                  padding: '7px 12px 7px 40px',
                  borderRadius: RADIUS,
                  textDecoration: 'none',
                  fontSize: 12.5,
                  whiteSpace: 'nowrap',
                  color: active ? 'var(--apex-accent-hover)' : 'var(--apex-muted)',
                  fontWeight: active ? 600 : 500,
                  background: active ? 'var(--apex-accent-lt)' : 'transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      )}

      {!isMobile && (
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--apex-border)' }}>
          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-end',
              width: '100%',
              padding: '9px 10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--apex-muted)',
              cursor: 'pointer',
              borderRadius: RADIUS,
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      )}
    </aside>
  )
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16 }}>
      {['MAA-OA', ...items].join('  /  ')}
    </div>
  )
}

const SIDEBAR_STORAGE_KEY = 'apex-sidebar-collapsed'
const MOBILE_BREAKPOINT = '(max-width: 767px)'

export function AppShell({ user, children }: { user: NavUser; children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Called once here rather than inside NotificationBell, so the sidebar's
  // per-nav-item badges (e.g. Announcements) and the header bell share one
  // poll instead of each fetching independently.
  const notifications = useNotifications()
  const navBadges = { announcements: notifications.unreadByType['announcement.posted'] ?? 0, notifications: notifications.unreadCount }

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true')
  }, [])

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT)
    setIsMobile(mql.matches)
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
      if (!e.matches) setMobileOpen(false)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Everyone gets signed out at 6:30pm daily (lib/auth.ts enforces this
  // server-side too, so a background poll or the next navigation would
  // eventually catch it) — this just makes it immediate for a tab that's
  // sitting open and idle right at the cutoff, instead of going stale until
  // the user next interacts with it.
  useEffect(() => {
    let triggered = false
    const checkCutoff = () => {
      if (triggered) return
      const now = new Date()
      if (now.getHours() > 18 || (now.getHours() === 18 && now.getMinutes() >= 30)) {
        triggered = true
        signOut({ callbackUrl: '/login?reason=cutoff' })
      }
    }
    const interval = setInterval(checkCutoff, 30_000)
    return () => clearInterval(interval)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  const sidebarWidth = isMobile ? 0 : collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  return (
    <div>
      <Header
        user={user}
        pathname={pathname}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen((prev) => !prev)}
        notifications={notifications}
      />
      <Sidebar
        user={user}
        pathname={pathname}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        navBadges={navBadges}
      />
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, top: HEADER_H, background: 'rgba(15,23,42,0.4)', zIndex: 140 }}
        />
      )}
      <main style={{ marginLeft: sidebarWidth, paddingTop: HEADER_H, minHeight: '100vh', transition: 'margin-left 0.18s ease' }}>
        <div style={{ padding: isMobile ? 16 : 24, maxWidth: 1400 }}>{children}</div>
      </main>
    </div>
  )
}
