'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import type { NotificationItem } from '@/lib/hooks/use-notifications'
import { NotificationRows } from '@/components/notifications/notification-rows'

export function NotificationBell({
  notifications,
  unreadCount,
  markRead,
  markAllRead,
}: {
  notifications: NotificationItem[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleClick(n: NotificationItem) {
    if (!n.read) await markRead(n.id)
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}
        aria-label="Notifications"
      >
        <Bell size={18} color="#fff" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: 15,
              height: 15,
              padding: '0 3px',
              borderRadius: 99,
              backgroundColor: 'var(--apex-red)',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 400 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 8,
              width: 340,
              maxHeight: 420,
              overflowY: 'auto',
              backgroundColor: '#fff',
              border: '1px solid var(--apex-border)',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 401,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--apex-border)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--apex-text)' }}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--apex-accent)', fontWeight: 600 }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <NotificationRows notifications={notifications} onItemClick={handleClick} variant="dropdown" emptyMessage="No notifications yet." />
          </div>
        </>
      )}
    </div>
  )
}
