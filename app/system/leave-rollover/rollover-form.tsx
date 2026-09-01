'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Row = {
  userId: string
  name: string
  entitlement: number | null
  broughtForward: number
  usedDays: number
  remaining: number | null
  proposedBroughtForward: number
}
type HistoryEntry = { fromYear: number; capDays: number | null; affectedCount: number; appliedByName: string; appliedAt: string }

const num = (n: number | null) => (n === null ? '—' : String(Math.round(n * 100) / 100))
const cell: React.CSSProperties = { borderRight: '1px solid var(--apex-border)', padding: '7px 12px', fontSize: 12 }

export function RolloverForm({ defaultYear, history }: { defaultYear: number; history: HistoryEntry[] }) {
  const router = useRouter()
  const [fromYear, setFromYear] = useState(defaultYear)
  const [cap, setCap] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [alreadyApplied, setAlreadyApplied] = useState<HistoryEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  async function preview() {
    setLoading(true)
    setRows(null)
    const params = new URLSearchParams({ fromYear: String(fromYear) })
    if (cap !== '') params.set('cap', cap)
    const res = await fetch(`/api/leave-rollover?${params}`)
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to load preview')
      return
    }
    const data = await res.json()
    setRows(data.rows)
    setAlreadyApplied(data.alreadyApplied)
  }

  async function apply() {
    if (!rows) return
    const changed = rows.filter((r) => r.proposedBroughtForward !== r.broughtForward).length
    if (!confirm(`Set brought-forward for ${rows.length} active staff (${changed} will change) using ${fromYear}'s unused Annual Leave? This cannot be undone.`)) return
    setApplying(true)
    const res = await fetch('/api/leave-rollover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromYear, cap: cap === '' ? null : Number(cap) }),
    })
    setApplying(false)
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      alert(`Rollover applied to ${data.affectedCount} staff.`)
      router.refresh()
      setRows(null)
    } else {
      alert(data.error ?? 'Rollover failed')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>
          Closing year
          <input
            type="number"
            value={fromYear}
            onChange={(e) => setFromYear(Number(e.target.value))}
            style={{ display: 'block', marginTop: 4, padding: '9px 10px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 14, width: 120 }}
          />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>
          Max carry-forward <span style={{ color: 'var(--apex-muted)', fontWeight: 400 }}>(optional)</span>
          <input
            type="number"
            min={0}
            step="0.5"
            value={cap}
            placeholder="no cap"
            onChange={(e) => setCap(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '9px 10px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 14, width: 120 }}
          />
        </label>
        <button
          onClick={preview}
          disabled={loading}
          style={{ padding: '10px 18px', borderRadius: 6, border: '1px solid var(--apex-border)', backgroundColor: 'var(--apex-surface)', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Loading…' : 'Preview'}
        </button>
      </div>

      {alreadyApplied && (
        <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--apex-amber-lt)', color: 'var(--apex-amber-fg)', fontSize: 12 }}>
          Rollover for {alreadyApplied.fromYear} was already applied on {new Date(alreadyApplied.appliedAt).toLocaleDateString('en-GB')} by {alreadyApplied.appliedByName}. Applying again is blocked.
        </div>
      )}

      {rows && (
        <>
          <div style={{ border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
                  {['Staff', `Ent. ${fromYear}`, 'B/f', 'Used', 'Remaining', `New B/f ${fromYear + 1}`].map((h) => (
                    <th key={h} style={{ ...cell, color: '#fff', fontWeight: 600, textAlign: 'left', letterSpacing: '0.03em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const changed = r.proposedBroughtForward !== r.broughtForward
                  return (
                    <tr key={r.userId} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                      <td style={cell}>{r.name}</td>
                      <td style={cell}>{num(r.entitlement)}</td>
                      <td style={cell}>{num(r.broughtForward)}</td>
                      <td style={cell}>{num(r.usedDays)}</td>
                      <td style={cell}>{num(r.remaining)}</td>
                      <td style={{ ...cell, fontWeight: 700, color: changed ? 'var(--apex-accent)' : 'var(--apex-muted)' }}>
                        {num(r.proposedBroughtForward)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            onClick={apply}
            disabled={applying || !!alreadyApplied}
            style={{ alignSelf: 'flex-start', padding: '11px 22px', borderRadius: 6, border: 'none', backgroundColor: alreadyApplied ? 'var(--apex-border-strong)' : 'var(--apex-navy)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: applying || alreadyApplied ? 'not-allowed' : 'pointer', opacity: applying ? 0.6 : 1 }}
          >
            {applying ? 'Applying…' : `Apply Rollover for ${fromYear}`}
          </button>
        </>
      )}

      {history.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--apex-muted)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Previous rollovers</div>
          {history.map((h) => (
            <div key={h.fromYear}>
              {h.fromYear} → {h.fromYear + 1}: {h.affectedCount} staff{h.capDays != null ? `, capped at ${h.capDays}` : ''} · {new Date(h.appliedAt).toLocaleDateString('en-GB')} by {h.appliedByName}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
