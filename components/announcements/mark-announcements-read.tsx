'use client'

import { useEffect } from 'react'
import { markNotificationTypeRead } from '@/lib/hooks/use-notifications'

// Visiting this page is itself the "I've seen the new announcements"
// signal — clears the Announcements nav badge without requiring the user
// to click through the bell first.
export function MarkAnnouncementsRead() {
  useEffect(() => {
    markNotificationTypeRead('announcement.posted')
  }, [])
  return null
}
