'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useNotifications, type NotificationItem } from '@/lib/hooks/use-notifications'

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const router = useRouter()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
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

            {notifications.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--apex-muted)', fontStyle: 'italic' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--apex-border)',
                    cursor: 'pointer',
                    backgroundColor: n.read ? '#fff' : 'var(--apex-accent-lt)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: 'var(--apex-text)', marginBottom: 2 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginBottom: 3 }}>{n.body}</div>}
                  <div style={{ fontSize: 10, color: 'var(--apex-muted)' }}>{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
