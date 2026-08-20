export type DayType = 'WEEKDAY' | 'SATURDAY' | 'SUNDAY' | 'PUBLIC_HOLIDAY'

const MEAL_ALLOWANCE = 3.5

export function hourlyRateOf(basicSalary: number | null | undefined): number {
  return basicSalary ? basicSalary / 26 / 8 : 0
}

export function dailyRateOf(basicSalary: number | null | undefined): number {
  return basicSalary ? basicSalary / 26 : 0
}

// "YYYY-MM-DD" from local calendar fields — matches how TimesheetEntry.date
// and PublicHoliday dates are both stored (local midnight via
// lib/date-utils.parseLocalDate), so this is safe to use as a lookup key.
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type PublicHolidayRange = { startDate: Date; endDate: Date; recurring: boolean }

// Non-recurring: the date must fall within the holiday's exact start–end
// range (year included) — e.g. Hari Raya, which shifts dates every year.
// Recurring: only the month/day of the range repeats — e.g. Merdeka Day
// (31 Aug every year) — so the range is re-anchored onto the checked date's
// own year before comparing. Doesn't handle a recurring range spanning a
// Dec 31 → Jan 1 boundary; no public holiday in practice does.
function dateFallsInHoliday(date: Date, holiday: PublicHolidayRange): boolean {
  if (!holiday.recurring) {
    return date.getTime() >= holiday.startDate.getTime() && date.getTime() <= holiday.endDate.getTime()
  }
  const year = date.getFullYear()
  const start = new Date(year, holiday.startDate.getMonth(), holiday.startDate.getDate())
  const end = new Date(year, holiday.endDate.getMonth(), holiday.endDate.getDate(), 23, 59, 59, 999)
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
}

export function isPublicHoliday(date: Date, holidays: readonly PublicHolidayRange[]): boolean {
  return holidays.some((h) => dateFallsInHoliday(date, h))
}

export function getDayType(date: Date, holidays: readonly PublicHolidayRange[]): DayType {
  if (isPublicHoliday(date, holidays)) return 'PUBLIC_HOLIDAY'
  const day = date.getDay()
  if (day === 0) return 'SUNDAY'
  if (day === 6) return 'SATURDAY'
  return 'WEEKDAY'
}

export type OtHours = {
  dayType: DayType
  payableHours: number
  mealAllowance: number
}

export type OtBreakdown = OtHours & { otCost: number }

// Determines payable OT hours and meal allowance from the day's total OT —
// deliberately salary-independent, so a day's OT spread across entries
// logged under different salary snapshots (see costForPayableHours) can
// still share one threshold determination.
//
// otHours must be the user's TOTAL OT logged across every entry on that one
// date — the Saturday/weekday thresholds apply to the whole day, not to any
// single entry, so callers are responsible for aggregating by (userId, date)
// before calling this.
export function getOtHoursForDay(dayType: DayType, otHours: number): OtHours {
  if (otHours <= 0) return { dayType, payableHours: 0, mealAllowance: 0 }

  switch (dayType) {
    case 'PUBLIC_HOLIDAY':
      return { dayType, payableHours: otHours, mealAllowance: 0 }

    case 'SUNDAY':
      // Continuous, uncapped — passes through half a day's wage at 4h and a
      // full day's wage at 8h once converted to cost, and keeps scaling
      // linearly beyond 8h.
      return { dayType, payableHours: otHours, mealAllowance: 0 }

    case 'SATURDAY': {
      // One-time deduction once daily OT reaches 6h — doesn't repeat for
      // further hours beyond that.
      const deduction = otHours >= 6 ? 1 : 0
      return { dayType, payableHours: Math.max(0, otHours - deduction), mealAllowance: 0 }
    }

    case 'WEEKDAY':
    default: {
      const isLongSession = otHours >= 4
      const deduction = isLongSession ? 0.5 : 0.25
      return { dayType, payableHours: Math.max(0, otHours - deduction), mealAllowance: isLongSession ? MEAL_ALLOWANCE : 0 }
    }
  }
}

// Converts payable OT hours into cost at one basic salary — split out from
// getOtHoursForDay so a day's OT can be priced per-entry using each entry's
// own salary snapshot, while the threshold/deduction determination above
// stays a single, salary-independent calculation for the whole day.
export function costForPayableHours(dayType: DayType, payableHours: number, basicSalary: number | null | undefined): number {
  if (payableHours <= 0) return 0
  const hourlyRate = hourlyRateOf(basicSalary)
  const dailyRate = dailyRateOf(basicSalary)
  switch (dayType) {
    case 'PUBLIC_HOLIDAY':
      // Naturally equals "2 days' wage" once 8h is reached, since
      // 8h * (basicSalary/26/8) * 2 = (basicSalary/26) * 2.
      return payableHours * hourlyRate * 2
    case 'SUNDAY':
      return (payableHours / 8) * dailyRate
    case 'SATURDAY':
    case 'WEEKDAY':
    default:
      return payableHours * hourlyRate * 1.5
  }
}

// otHours must be the user's TOTAL OT logged across every entry on that one
// date (see getOtHoursForDay). Convenience wrapper for callers pricing a
// whole day at a single salary; per-entry snapshot pricing should call
// getOtHoursForDay + costForPayableHours directly instead (see lib/entry-cost.ts).
export function calcOtForDay(dayType: DayType, otHours: number, basicSalary: number | null | undefined): OtBreakdown {
  const hours = getOtHoursForDay(dayType, otHours)
  return { ...hours, otCost: costForPayableHours(dayType, hours.payableHours, basicSalary) }
}

export function calcNormalCost(normalMins: number, basicSalary: number | null | undefined): number {
  return (normalMins / 60) * hourlyRateOf(basicSalary)
}

export function formatCurrency(value: number) {
  return `RM ${value.toFixed(2)}`
}
