export const TIMESHEET_EDIT_WINDOW_DAYS = 7

export function isEntryLocked(entryDate: Date, now: Date = new Date()) {
  const msPerDay = 24 * 60 * 60 * 1000
  const ageDays = (now.getTime() - entryDate.getTime()) / msPerDay
  return ageDays > TIMESHEET_EDIT_WINDOW_DAYS
}
