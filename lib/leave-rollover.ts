import { prisma } from '@/lib/prisma'
import { getAnnualLeaveBalance } from '@/lib/leave-balance'
import { logAudit } from '@/lib/audit'

// Days carried into next year's brought-forward: never negative, and capped
// if HR set a maximum-carry-forward policy (leave capDays null for no cap).
export function proposeBroughtForward(remaining: number | null, capDays: number | null): number {
  const carried = Math.max(0, remaining ?? 0)
  return capDays === null ? carried : Math.min(carried, capDays)
}

export type RolloverRow = {
  userId: string
  name: string
  entitlement: number | null
  broughtForward: number
  usedDays: number
  remaining: number | null
  proposedBroughtForward: number
}

// Preview only — reads each active user's Annual Leave balance for the year
// being closed and works out what their new brought-forward would become.
// Changes nothing.
export async function computeRolloverPreview(fromYear: number, capDays: number | null): Promise<RolloverRow[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return Promise.all(
    users.map(async (u) => {
      const b = await getAnnualLeaveBalance(u.id, fromYear)
      return {
        userId: u.id,
        name: u.name,
        entitlement: b.entitlement,
        broughtForward: b.broughtForward,
        usedDays: b.usedDays,
        remaining: b.remaining,
        proposedBroughtForward: proposeBroughtForward(b.remaining, capDays),
      }
    })
  )
}

export async function getRolloverHistory() {
  return prisma.leaveRollover.findMany({ orderBy: { fromYear: 'desc' } })
}

// Writes annualLeaveBroughtForward for every active user and records the run.
// The LeaveRollover.fromYear unique row is the guard against a double-apply:
// re-running would read the brought-forward it just wrote and roll it a
// second time. Only Annual Leave rolls over — Medical Leave (MC) is
// use-it-or-lose-it, so it's deliberately untouched here.
export async function applyRollover(
  fromYear: number,
  capDays: number | null,
  actor: { id: string; name?: string | null }
): Promise<{ affectedCount: number }> {
  const existing = await prisma.leaveRollover.findUnique({ where: { fromYear } })
  if (existing) {
    throw new Error(
      `Rollover for ${fromYear} was already applied on ${existing.appliedAt.toISOString().slice(0, 10)} by ${existing.appliedByName}.`
    )
  }

  const rows = await computeRolloverPreview(fromYear, capDays)
  await prisma.$transaction([
    ...rows.map((r) =>
      prisma.user.update({
        where: { id: r.userId },
        data: { annualLeaveBroughtForward: r.proposedBroughtForward },
      })
    ),
    prisma.leaveRollover.create({
      data: {
        fromYear,
        capDays,
        affectedCount: rows.length,
        appliedById: actor.id,
        appliedByName: actor.name ?? 'Unknown',
      },
    }),
  ])

  await logAudit({
    actor,
    action: 'leave_rollover.applied',
    targetType: 'LeaveRollover',
    targetLabel: String(fromYear),
    metadata: { fromYear, capDays, affectedCount: rows.length },
  })

  return { affectedCount: rows.length }
}
