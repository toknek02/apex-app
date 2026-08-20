import { prisma } from '@/lib/prisma'
import { calcNormalCost, costForPayableHours, getDayType, getOtHoursForDay } from '@/lib/payroll'

type EntryForCost = {
  id: string
  userId: string
  date: Date
  normalMins: number
  otMins: number
  // Salary snapshot at creation time — null on rows predating this field,
  // which fall back to basicSalaryByUserId (the user's CURRENT salary).
  basicSalaryAtEntry?: number | null
}

export type EntryCost = { normalCost: number; otCost: number; totalCost: number }

// Attributes normal + OT cost to each entry. Two things make this more than
// a per-entry lookup:
//
// 1. A user's daily OT total can span more than one project or event type,
//    and the weekday/Saturday/Sunday/public-holiday THRESHOLDS (e.g.
//    Saturday's 6h deduction trigger) apply to that whole day's total, not
//    any single entry — so this looks up each affected user's full daily OT
//    (across everything, not just the entries passed in) before splitting
//    the day's payable hours back across entries proportional to each one's
//    share of that day's total OT minutes.
// 2. Each entry is priced using ITS OWN basicSalaryAtEntry snapshot, not the
//    user's current salary — so a later raise/pay cut doesn't retroactively
//    change the cost of entries already logged. The threshold determination
//    in (1) is kept salary-independent for exactly this reason: a day's OT
//    could in principle span entries with different snapshots.
export async function attributeEntryCosts(
  entries: EntryForCost[],
  basicSalaryByUserId: Map<string, number | null>
): Promise<Map<string, EntryCost>> {
  const result = new Map<string, EntryCost>()
  if (entries.length === 0) return result

  const userIds = [...new Set(entries.map((e) => e.userId))]
  const dates = [...new Set(entries.map((e) => e.date.getTime()))].map((t) => new Date(t))

  const [dayOtSums, publicHolidays] = await Promise.all([
    prisma.timesheetEntry.groupBy({
      by: ['userId', 'date'],
      where: { userId: { in: userIds }, date: { in: dates } },
      _sum: { otMins: true },
    }),
    prisma.publicHoliday.findMany({ select: { startDate: true, endDate: true, recurring: true } }),
  ])
  const dayTotalOt = new Map<string, number>()
  for (const row of dayOtSums) dayTotalOt.set(`${row.userId}|${row.date.getTime()}`, row._sum.otMins ?? 0)

  for (const e of entries) {
    const salaryForEntry = e.basicSalaryAtEntry ?? basicSalaryByUserId.get(e.userId) ?? null
    const normalCost = calcNormalCost(e.normalMins, salaryForEntry)

    let otCost = 0
    let mealAllowance = 0
    if (e.otMins > 0) {
      const dayOtMins = dayTotalOt.get(`${e.userId}|${e.date.getTime()}`) ?? e.otMins
      const dayType = getDayType(e.date, publicHolidays)
      const dayHours = getOtHoursForDay(dayType, dayOtMins / 60)
      const share = e.otMins / dayOtMins
      const entryPayableHours = dayHours.payableHours * share
      otCost = costForPayableHours(dayType, entryPayableHours, salaryForEntry)
      mealAllowance = dayHours.mealAllowance * share
    }
    result.set(e.id, { normalCost, otCost: otCost + mealAllowance, totalCost: normalCost + otCost + mealAllowance })
  }
  return result
}
