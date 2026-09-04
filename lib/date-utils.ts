// Parses a "YYYY-MM-DD" string into a local-midnight Date, not UTC midnight
// (`new Date("YYYY-MM-DD")` parses as UTC, which lands on the wrong local
// calendar day for timezones west of UTC — see the Gantt chart's date bug).
export function parseLocalDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return Number.isNaN(date.getTime()) ? null : date
}

export function enumerateDaysInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  const last = new Date(end)
  last.setHours(0, 0, 0, 0)
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

// How many days of balance an application consumes. Lives here rather than in
// lib/leave-balance.ts so the application form (a client component) can warn
// against the same number the server enforces — leave-balance.ts pulls in
// Prisma and can't be imported from the browser.
export function daysForApplication(a: { startDate: Date; endDate: Date; dayPortion: string }): number {
  if (a.dayPortion === 'AM' || a.dayPortion === 'PM') return 0.5
  return enumerateDaysInclusive(a.startDate, a.endDate).length
}
