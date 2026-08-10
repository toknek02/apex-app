'use client'

import { useState } from 'react'

type Staff = { id: string; name: string }
type Venue = { id: string; description: string }
type Project = { id: string; code: string; shortName: string }
type EventResult = {
  id: string
  title: string
  date: string
  venue: { description: string } | null
  externalVenue: string | null
  attendees: { user: { name: string } }[]
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

export function FindEventsForm({ staff, venues, projects }: { staff: Staff[]; venues: Venue[]; projects: Project[] }) {
  const [keyword, setKeyword] = useState('')
  const [staffId, setStaffId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [venueId, setVenueId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [results, setResults] = useState<EventResult[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true)
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (staffId) params.set('staffId', staffId)
    if (from) params.set('from', new Date(from).toISOString())
    if (to) params.set('to', new Date(to).toISOString())
    if (venueId) params.set('venueId', venueId)
    if (projectId) params.set('projectId', projectId)

    const res = await fetch(`/api/events?${params.toString()}`)
    const data = await res.json()
    setResults(data.events ?? [])
    setLoading(false)
  }

  function handleReset() {
    setKeyword('')
    setStaffId('')
    setFrom('')
    setTo('')
    setVenueId('')
    setProjectId('')
    setResults(null)
  }

  return (
    <>
      <form
        onSubmit={handleSearch}
        style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 20, marginBottom: 20 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Keyword / Title</label>
            <input style={inputStyle} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Staff</label>
            <select style={inputStyle} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">All</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Venue</label>
            <select style={inputStyle} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
              <option value="">All</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>From</label>
            <input type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>To</label>
            <input type="date" style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Project</label>
            <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">All</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.shortName}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="submit"
            style={{ padding: '8px 18px', backgroundColor: 'var(--apex-accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{ padding: '8px 18px', backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>
      </form>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Date', 'Time', 'Title', 'Venue'].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results === null && (
              <tr><td colSpan={4} style={{ padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>{loading ? 'Searching…' : 'Enter criteria and click Search.'}</td></tr>
            )}
            {results?.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>No matching events found.</td></tr>
            )}
            {results?.map((e, i) => {
              const d = new Date(e.date)
              return (
                <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>{d.toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>{d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>
                    {e.attendees.map((a) => a.user.name).join(', ')}
                    {e.attendees.length > 0 ? ': ' : ''}
                    {e.title}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{e.venue?.description ?? e.externalVenue ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
