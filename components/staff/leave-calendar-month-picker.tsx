'use client'

import { useRouter } from 'next/navigation'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 12,
}

export function LeaveCalendarMonthPicker({ year, month }: { year: number; month: number }) {
  const router = useRouter()

  function navigate(newYear: number, newMonth: number) {
    router.push(`/staff/leave/calendar?month=${newYear}-${String(newMonth + 1).padStart(2, '0')}`)
  }

  const yearOptions = Array.from({ length: 6 }, (_, i) => year - 3 + i)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select style={selectStyle} value={month} onChange={(e) => navigate(year, Number(e.target.value))}>
        {MONTHS.map((m, i) => (
          <option key={m} value={i}>{m}</option>
        ))}
      </select>
      <select style={selectStyle} value={year} onChange={(e) => navigate(Number(e.target.value), month)}>
        {yearOptions.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
