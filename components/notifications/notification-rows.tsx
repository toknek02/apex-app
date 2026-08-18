'use client'

import { useState } from 'react'
import type { NotificationItem } from '@/lib/hooks/use-notifications'
import { groupNotifications, groupSummary } from '@/lib/notification-grouping'

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

type Variant = 'dropdown' | 'page'

const SIZES: Record<Variant, { padding: string; titleSize: number; bodySize: number; metaSize: number }> = {
  dropdown: { padding: '10px 14px', titleSize: 12, bodySize: 11, metaSize: 10 },
  page: { padding: '14px 16px', titleSize: 13, bodySize: 12, metaSize: 11 },
}

function Row({ item, variant, onClick, alt }: { item: NotificationItem; variant: Variant; onClick: (n: NotificationItem) => void; alt: boolean }) {
  const s = SIZES[variant]
  return (
    <div
      onClick={() => onClick(item)}
      style={{
        padding: s.padding,
        borderBottom: '1px solid var(--apex-border)',
        cursor: item.link ? 'pointer' : 'default',
        backgroundColor: item.read ? (alt ? 'var(--apex-row-alt)' : '#fff') : 'var(--apex-accent-lt)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: s.titleSize, fontWeight: item.read ? 500 : 700, color: 'var(--apex-text)' }}>{item.title}</div>
        <div style={{ fontSize: s.metaSize, color: 'var(--apex-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.createdAt)}</div>
      </div>
      {item.body && <div style={{ fontSize: s.bodySize, color: 'var(--apex-muted)', marginTop: 3 }}>{item.body}</div>}
    </div>
  )
}

function GroupRow({ type, items, variant, onItemClick }: { type: string; items: NotificationItem[]; variant: Variant; onItemClick: (n: NotificationItem) => void }) {
  const [expanded, setExpanded] = useState(false)
  const s = SIZES[variant]
  const unread = items.filter((n) => !n.read).length

  if (expanded) {
    return (
      <div>
        <div
          onClick={() => setExpanded(false)}
          style={{ padding: s.padding, borderBottom: '1px solid var(--apex-border)', cursor: 'pointer', fontSize: s.metaSize, color: 'var(--apex-accent)', fontWeight: 600 }}
        >
          ▾ Collapse
        </div>
        {items.map((item, i) => (
          <Row key={item.id} item={item} variant={variant} onClick={onItemClick} alt={i % 2 === 1} />
        ))}
      </div>
    )
  }

  return (
    <div
      onClick={() => setExpanded(true)}
      style={{
        padding: s.padding,
        borderBottom: '1px solid var(--apex-border)',
        cursor: 'pointer',
        backgroundColor: unread > 0 ? 'var(--apex-accent-lt)' : '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ fontSize: s.titleSize, fontWeight: unread > 0 ? 700 : 500, color: 'var(--apex-text)' }}>
        {groupSummary(type, items.length)}
        {unread > 0 && <span style={{ color: 'var(--apex-accent)' }}> · {unread} unread</span>}
      </div>
      <div style={{ fontSize: s.metaSize, color: 'var(--apex-muted)', whiteSpace: 'nowrap' }}>▸ Show</div>
    </div>
  )
}

export function NotificationRows({
  notifications,
  onItemClick,
  variant,
  emptyMessage,
}: {
  notifications: NotificationItem[]
  onItemClick: (n: NotificationItem) => void
  variant: Variant
  emptyMessage: string
}) {
  if (notifications.length === 0) {
    return (
      <div style={{ padding: variant === 'page' ? 24 : '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--apex-muted)', fontStyle: 'italic' }}>
        {emptyMessage}
      </div>
    )
  }

  const groups = groupNotifications(notifications)
  let altToggle = 0
  return (
    <>
      {groups.map((g, gi) => {
        if (g.kind === 'group') return <GroupRow key={`group-${gi}`} type={g.type} items={g.items} variant={variant} onItemClick={onItemClick} />
        const alt = altToggle % 2 === 1
        altToggle++
        return <Row key={g.item.id} item={g.item} variant={variant} onClick={onItemClick} alt={alt} />
      })}
    </>
  )
}
