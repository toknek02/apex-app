'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i) // 0..24

function formatHourOption(h: number) {
  if (h === 0) return '12am'
  if (h === 24) return '12am (next day)'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export function GanttRangeControl({ startHour, endHour }: { startHour: number; endHour: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function update(key: 'startHour' | 'endHour', value: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, String(value))
    router.push(`/staff/activities/summary?${params.toString()}`)
  }

  const selectStyle: React.CSSProperties = {
    padding: '5px 8px',
    border: '1px solid var(--apex-border)',
    borderRadius: 6,
    fontSize: 12,
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--apex-muted)' }}>
      Chart:
      <select style={selectStyle} value={startHour} onChange={(e) => update('startHour', Number(e.target.value))}>
        {HOUR_OPTIONS.filter((h) => h < endHour).map((h) => (
          <option key={h} value={h}>{formatHourOption(h)}</option>
        ))}
      </select>
      to
      <select style={selectStyle} value={endHour} onChange={(e) => update('endHour', Number(e.target.value))}>
        {HOUR_OPTIONS.filter((h) => h > startHour).map((h) => (
          <option key={h} value={h}>{formatHourOption(h)}</option>
        ))}
      </select>
      {(startHour !== 9 || endHour !== 18) && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString())
            params.delete('startHour')
            params.delete('endHour')
            router.push(`/staff/activities/summary?${params.toString()}`)
          }}
          style={{ ...selectStyle, cursor: 'pointer', backgroundColor: '#fff' }}
        >
          Reset
        </button>
      )}
    </div>
  )
}
