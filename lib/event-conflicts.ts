import { prisma } from '@/lib/prisma'

export type EventConflict = {
  occurrenceDate: Date
  conflictingEvent: { id: string; title: string; date: Date; private: boolean; createdById: string; attendeeIds: string[] }
  // Set only for attendee clashes — which person is double-booked.
  staffName?: string
}

/** Two events clash when either starts before the other ends. */
export function overlaps(aStart: Date, aMins: number, bStart: Date, bMins: number): boolean {
  const aFrom = aStart.getTime()
  const bFrom = bStart.getTime()
  return aFrom < bFrom + bMins * 60_000 && bFrom < aFrom + aMins * 60_000
}

// One day either side of the proposed range, so an existing event that starts
// the day before can still be caught by the overlap test above.
function searchWindow(occurrences: { date: Date; durationMins: number }[]) {
  const dayMs = 24 * 60 * 60 * 1000
  const minStart = Math.min(...occurrences.map((o) => o.date.getTime()))
  const maxEnd = Math.max(...occurrences.map((o) => o.date.getTime() + o.durationMins * 60_000))
  return { gte: new Date(minStart - dayMs), lte: new Date(maxEnd + dayMs) }
}

const CONFLICT_SELECT = {
  id: true,
  title: true,
  date: true,
  durationMins: true,
  private: true,
  createdById: true,
  attendees: { select: { userId: true, user: { select: { name: true } } } },
} as const

/**
 * Checks a set of proposed event occurrences against existing bookings at the same venue.
 * Only venues with collisionCheck enabled are checked; returns [] otherwise.
 */
export async function findVenueConflicts(
  venueId: string,
  occurrences: { date: Date; durationMins: number }[],
  excludeEventId?: string
): Promise<EventConflict[]> {
  if (occurrences.length === 0) return []

  const venue = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!venue?.collisionCheck) return []

  const existing = await prisma.event.findMany({
    where: {
      venueId,
      ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
      date: searchWindow(occurrences),
    },
    select: CONFLICT_SELECT,
  })

  const conflicts: EventConflict[] = []
  for (const occ of occurrences) {
    for (const e of existing) {
      if (!overlaps(occ.date, occ.durationMins, e.date, e.durationMins ?? 60)) continue
      conflicts.push({
        occurrenceDate: occ.date,
        conflictingEvent: { id: e.id, title: e.title, date: e.date, private: e.private, createdById: e.createdById, attendeeIds: e.attendees.map((a) => a.userId) },
      })
    }
  }
  return conflicts
}

/**
 * Checks proposed occurrences against events the same people are already on —
 * nobody can be in two places at once, so an overlap is a hard clash.
 */
export async function findAttendeeConflicts(
  attendeeIds: string[],
  occurrences: { date: Date; durationMins: number }[],
  excludeEventId?: string
): Promise<EventConflict[]> {
  if (attendeeIds.length === 0 || occurrences.length === 0) return []

  const existing = await prisma.event.findMany({
    where: {
      attendees: { some: { userId: { in: attendeeIds } } },
      ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
      date: searchWindow(occurrences),
    },
    select: CONFLICT_SELECT,
  })

  const conflicts: EventConflict[] = []
  for (const occ of occurrences) {
    for (const e of existing) {
      if (!overlaps(occ.date, occ.durationMins, e.date, e.durationMins ?? 60)) continue
      // Report the first proposed attendee who's already on that event —
      // naming one person is enough for the user to act on.
      const clashing = e.attendees.find((a) => attendeeIds.includes(a.userId))
      if (!clashing) continue
      conflicts.push({
        occurrenceDate: occ.date,
        conflictingEvent: { id: e.id, title: e.title, date: e.date, private: e.private, createdById: e.createdById, attendeeIds: e.attendees.map((a) => a.userId) },
        staffName: clashing.user.name,
      })
    }
  }
  return conflicts
}

// A conflict against a private event the requester has no visibility into (per
// the same rule /api/events and /logbook already enforce) must not reveal that
// event's title — otherwise booking a venue, or adding staff, becomes a way to
// probe private events you can't otherwise see.
export function describeConflict(conflict: EventConflict, viewer: { id: string; canSeeAllPrivate: boolean }): string {
  const e = conflict.conflictingEvent
  const visible = viewer.canSeeAllPrivate || !e.private || e.createdById === viewer.id || e.attendeeIds.includes(viewer.id)
  const when = e.date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  return visible ? `"${e.title}" on ${when}` : `an existing booking on ${when}`
}
