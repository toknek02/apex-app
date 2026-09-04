// List views show a capped preview of who's on an event — a 40-person event
// otherwise buries the rest of the row. The full list stays one click away in
// the event details.
export const MAX_LISTED_ATTENDEES = 5

export function formatAttendees(names: string[], max = MAX_LISTED_ATTENDEES): string {
  if (names.length <= max) return names.join(', ')
  const hidden = names.length - max
  return `${names.slice(0, max).join(', ')} and ${hidden} other${hidden === 1 ? '' : 's'}`
}
