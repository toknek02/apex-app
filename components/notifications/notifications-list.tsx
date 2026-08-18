'use client'

import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/hooks/use-notifications'
import type { NotificationItem } from '@/lib/hooks/use-notifications'
import { NotificationRows } from '@/components/notifications/notification-rows'

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

      <NotificationRows notifications={notifications} onItemClick={handleClick} variant="page" emptyMessage="No notifications yet." />
    </div>
  )
}
