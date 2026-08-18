// Single source of truth for every notification `type` the app creates —
// used to render mute preferences and digest group labels. Add a new entry
// here whenever a new notifyUsers() call site introduces a new type.
export const NOTIFICATION_TYPES: { type: string; label: string; description: string }[] = [
  {
    type: 'leave_application.submitted',
    label: 'Leave application submitted',
    description: 'A staff member you approve leave for (or that HR oversees) submitted an application.',
  },
  {
    type: 'leave_application.approved',
    label: 'Leave application approved',
    description: 'Your leave application was approved.',
  },
  {
    type: 'leave_application.rejected',
    label: 'Leave application rejected',
    description: 'Your leave application was rejected.',
  },
  {
    type: 'announcement.posted',
    label: 'New announcement',
    description: 'A new company-wide or targeted announcement was posted.',
  },
]

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPES.find((t) => t.type === type)?.label ?? type
}
