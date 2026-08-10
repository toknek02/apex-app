export const PROJECT_STATUSES = ['Active', 'On Hold', 'Suspended', 'Completed', 'Archived'] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'var(--apex-green-lt)', color: 'var(--apex-green)' },
  'On Hold': { bg: '#fff4e0', color: '#b76e00' },
  Suspended: { bg: 'var(--apex-red-lt)', color: 'var(--apex-red)' },
  Completed: { bg: '#e0ecff', color: '#2255cc' },
  Archived: { bg: 'var(--apex-row-alt)', color: 'var(--apex-muted)' },
}
