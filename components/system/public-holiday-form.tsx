'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

type PublicHoliday = { id: string; date: string; name: string }

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })
}

export function PublicHolidayForm({ publicHolidays }: { publicHolidays: PublicHoliday[] }) {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!date || !name.trim()) {
      setError('Date and name are required')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/public-holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, name }),
    })
    setSubmitting(false)
    if (res.ok) {
      setDate('')
      setName('')
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
    <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Date</label>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
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
              <tr key={h.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                <td style={{ padding: '8px 10px', width: 160 }}>{fmtDate(h.date)}</td>
                <td style={{ padding: '8px 10px' }}>{h.name}</td>
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
