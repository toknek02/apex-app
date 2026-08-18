'use client'

import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/hooks/use-notifications'
import type { NotificationItem } from '@/lib/hooks/use-notifications'

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

export function NotificationsList() {
  const router = useRouter()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(100)

  async function handleClick(n: NotificationItem) {
    if (!n.read) await markRead(n.id)
    if (n.link) router.push(n.link)
  }

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--apex-tbl-hdr)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 600, textDecoration: 'underline' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--apex-muted)', fontStyle: 'italic' }}>
          No notifications yet.
        </div>
      ) : (
        notifications.map((n, i) => (
          <div
            key={n.id}
            onClick={() => handleClick(n)}
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--apex-border)',
              cursor: n.link ? 'pointer' : 'default',
              backgroundColor: n.read ? (i % 2 ? 'var(--apex-row-alt)' : '#fff') : 'var(--apex-accent-lt)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--apex-text)' }}>{n.title}</div>
              <div style={{ fontSize: 11, color: 'var(--apex-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(n.createdAt)}</div>
            </div>
            {n.body && <div style={{ fontSize: 12, color: 'var(--apex-muted)', marginTop: 3 }}>{n.body}</div>}
          </div>
        ))
      )}
    </div>
  )
}
