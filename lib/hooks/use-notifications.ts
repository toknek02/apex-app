'use client'

import { useCallback, useEffect, useState } from 'react'

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

// Fired after marking a notification type read from somewhere outside the
// hook itself (e.g. the Announcements page marking announcement.posted
// read on visit) — every useNotifications() instance refetches on hearing
// it, so the sidebar badge clears immediately instead of waiting for the
// next 60s poll.
const REFRESH_EVENT = 'apex:notifications-refresh'

export async function markNotificationTypeRead(type: string) {
  await fetch(`/api/notifications/mark-all-read?type=${encodeURIComponent(type)}`, { method: 'PATCH' })
  window.dispatchEvent(new Event(REFRESH_EVENT))
}

export function useNotifications(limit = 20) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadByType, setUnreadByType] = useState<Record<string, number>>({})

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/notifications?limit=${limit}`)
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setUnreadByType(data.unreadByType ?? {})
    }
  }, [limit])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener(REFRESH_EVENT, refresh)
    // Polling every 15s while the tab is in the background just burns
    // requests nobody will see in time, so the interval below skips its own
    // tick while hidden — the 'focus' listener already refetches the moment
    // someone switches back, and this also catches switching to a visible
    // tab without a window focus event (e.g. Alt-Tab between two apps that
    // both keep window focus at the OS level).
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 15_000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener(REFRESH_EVENT, refresh)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(interval)
    }
  }, [refresh])

  async function markRead(id: string) {
    const target = notifications.find((n) => n.id === id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    if (target && !target.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
      setUnreadByType((prev) => ({ ...prev, [target.type]: Math.max(0, (prev[target.type] ?? 0) - 1) }))
    }
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    // Other useNotifications() instances on the page (e.g. the sidebar badge
    // when this call came from the full Notifications page) have their own
    // local state and won't see this change until their next 60s poll —
    // nudge them to refetch now instead.
    window.dispatchEvent(new Event(REFRESH_EVENT))
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    setUnreadByType({})
    await fetch('/api/notifications/mark-all-read', { method: 'PATCH' })
    window.dispatchEvent(new Event(REFRESH_EVENT))
  }

  return { notifications, unreadCount, unreadByType, markRead, markAllRead, refresh }
}
