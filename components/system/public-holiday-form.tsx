'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

type PublicHoliday = { id: string; startDate: string; endDate: string; name: string; recurring: boolean }

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', ...opts })
}

function rangeLabel(h: PublicHoliday) {
  const sameDay = h.startDate.slice(0, 10) === h.endDate.slice(0, 10)
  if (sameDay) return fmtDate(h.startDate, { year: h.recurring ? undefined : 'numeric', weekday: 'short' })
  const yearOpt = h.recurring ? {} : { year: 'numeric' as const }
  return `${fmtDate(h.startDate, yearOpt)} – ${fmtDate(h.endDate, { ...yearOpt, weekday: 'short' })}`
}

export function PublicHolidayForm({ publicHolidays }: { publicHolidays: PublicHoliday[] }) {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [name, setName] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!startDate || !name.trim()) {
      setError('Start date and name are required')
      return
    }
    if (endDate && endDate < startDate) {
      setError('End date must be on or after start date')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/public-holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate: endDate || startDate, name, recurring }),
    })
    setSubmitting(false)
    if (res.ok) {
      setStartDate('')
      setEndDate('')
      setName('')
      setRecurring(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to add public holiday')
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/public-holidays/${id}`, { method: 'DELETE' })
    setDeletingId('')
    if (res.ok) router.refresh()
  }

  return (
    <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Start Date</label>
            <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>End Date</label>
            <input type="date" style={inputStyle} value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} placeholder={startDate} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Name</label>
            <input style={{ ...inputStyle, width: '100%' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Merdeka Day" />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '8px 16px', backgroundColor: 'var(--apex-navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Repeats every year on this date
        </label>
        <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
          For holidays that fall on the same day every year (e.g. Merdeka Day) rather than shifting (e.g. Hari Raya).
          Leave End Date blank for a single-day holiday.
        </div>
      </form>
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          {error}
        </div>
      )}

      {publicHolidays.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--apex-muted)', fontStyle: 'italic' }}>No public holidays added yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {publicHolidays.map((h, i) => (
              <tr key={h.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                <td style={{ padding: '8px 10px', width: 220 }}>{rangeLabel(h)}</td>
                <td style={{ padding: '8px 10px' }}>
                  {h.name}
                  {h.recurring && (
                    <span style={{ marginLeft: 8, padding: '1px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: 'var(--apex-accent)', backgroundColor: 'var(--apex-accent-lt)' }}>
                      Yearly
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 10px', width: 32, textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(h.id)}
                    disabled={deletingId === h.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    aria-label={`Delete ${h.name}`}
                  >
                    <Trash2 size={14} color="var(--apex-red)" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
