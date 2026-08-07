import { prisma } from '@/lib/prisma'

export type VenueConflict = {
  occurrenceDate: Date
  conflictingEvent: { id: string; title: string; date: Date }
}

/**
 * Checks a set of proposed event occurrences against existing bookings at the same venue.
 * Only venues with collisionCheck enabled are checked; returns [] otherwise.
 */
export async function findVenueConflicts(
  venueId: string,
  occurrences: { date: Date; durationMins: number }[],
  excludeEventId?: string
): Promise<VenueConflict[]> {
  if (occurrences.length === 0) return []

  const venue = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!venue?.collisionCheck) return []

  const minStart = Math.min(...occurrences.map((o) => o.date.getTime()))
  const maxEnd = Math.max(...occurrences.map((o) => o.date.getTime() + o.durationMins * 60_000))
  const dayMs = 24 * 60 * 60 * 1000

  const existing = await prisma.event.findMany({
    where: {
      venueId,
      ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
      date: { gte: new Date(minStart - dayMs), lte: new Date(maxEnd + dayMs) },
    },
    select: { id: true, title: true, date: true, durationMins: true },
  })

  const conflicts: VenueConflict[] = []
  for (const occ of occurrences) {
    const occStart = occ.date.getTime()
    const occEnd = occStart + occ.durationMins * 60_000
    for (const e of existing) {
      const eStart = e.date.getTime()
      const eEnd = eStart + (e.durationMins ?? 60) * 60_000
      if (occStart < eEnd && eStart < occEnd) {
        conflicts.push({ occurrenceDate: occ.date, conflictingEvent: { id: e.id, title: e.title, date: e.date } })
      }
    }
  }
  return conflicts
}
