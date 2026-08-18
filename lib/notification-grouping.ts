import type { NotificationItem } from '@/lib/hooks/use-notifications'
import { notificationTypeLabel } from '@/lib/notification-types'

export type NotificationGroup =
  | { kind: 'single'; item: NotificationItem }
  | { kind: 'group'; type: string; items: NotificationItem[] }

const GROUP_MIN_SIZE = 3

// Collapses runs of 3+ consecutive same-type notifications (the list is
// already sorted newest-first, so a run is naturally a burst — e.g. several
// leave applications submitted back to back) into a single digest entry,
// so an inbox doesn't get buried under one event type. Shorter runs render
// individually as before.
export function groupNotifications(notifications: NotificationItem[]): NotificationGroup[] {
  const groups: NotificationGroup[] = []
  let i = 0
  while (i < notifications.length) {
    let j = i + 1
    while (j < notifications.length && notifications[j].type === notifications[i].type) j++
    const run = notifications.slice(i, j)
    if (run.length >= GROUP_MIN_SIZE) {
      groups.push({ kind: 'group', type: run[0].type, items: run })
    } else {
      for (const item of run) groups.push({ kind: 'single', item })
    }
    i = j
  }
  return groups
}

// Type labels are full phrases ("Leave application submitted"), not nouns,
// so naively appending "s" reads badly ("4 leave application submitteds") —
// a count prefix avoids needing to pluralize the phrase at all.
export function groupSummary(type: string, count: number): string {
  return `${count} × ${notificationTypeLabel(type)}`
}
