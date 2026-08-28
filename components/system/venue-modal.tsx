'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

type Venue = { id: string; description: string; collisionCheck: boolean }

export function VenueModal({ venue, trigger }: { venue?: Venue; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState(venue?.description ?? '')
  const [collisionCheck, setCollisionCheck] = useState(venue?.collisionCheck ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    if (!description.trim()) {
      setError('Description is required')
      return
    }
    setSaving(true)
    const res = await fetch(venue ? `/api/venues/${venue.id}` : '/api/venues', {
      method: venue ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, collisionCheck }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save venue')
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'inline-flex' }}>
        {trigger}
      </span>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
          onClick={() => setOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--apex-surface)', borderRadius: 10, padding: 24, width: 380 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{venue ? 'Edit Venue' : 'New Venue'}</h2>

            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Collision Check</label>
              <select style={inputStyle} value={collisionCheck ? 'yes' : 'no'} onChange={(e) => setCollisionCheck(e.target.value === 'yes')}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--apex-border)', backgroundColor: 'var(--apex-surface)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '8px 16px', border: 'none', backgroundColor: 'var(--apex-navy)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
