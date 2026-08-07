export function formatDuration(startDate: Date | null, completedAt: Date | null): string {
  if (!startDate) return 'Start date not set'

  const end = completedAt ?? new Date()
  const totalDays = Math.max(0, Math.floor((end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

  if (totalDays === 0) return completedAt ? 'Started and completed same day' : 'Started today'

  const years = Math.floor(totalDays / 365)
  const months = Math.floor((totalDays % 365) / 30)
  const days = totalDays % 30

  const parts: string[] = []
  if (years > 0) parts.push(`${years} yr${years === 1 ? '' : 's'}`)
  if (months > 0) parts.push(`${months} mo${months === 1 ? '' : 's'}`)
  if (years === 0 && months === 0 && days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)

  const label = parts.join(' ')
  return completedAt ? `${label} (completed)` : `${label} so far`
}
