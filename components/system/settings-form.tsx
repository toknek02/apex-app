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

type Settings = {
  officeLat: number | null
  officeLng: number | null
  officeRadiusM: number
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter()
  const [officeLat, setOfficeLat] = useState(settings.officeLat?.toString() ?? '')
  const [officeLng, setOfficeLng] = useState(settings.officeLng?.toString() ?? '')
  const [officeRadiusM, setOfficeRadiusM] = useState(settings.officeRadiusM.toString())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setError('')
    setSaved(false)
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officeLat, officeLng, officeRadiusM }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save settings')
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 560 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Office Location</h2>
      <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16 }}>
        Used to restrict login to staff physically near the office (attendance is now tied to
        login/logout). This is not enforced yet — geolocation requires the app to be served over
        HTTPS, which is planned for a later launch step.
      </p>

      {error && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Latitude</label>
          <input style={inputStyle} value={officeLat} onChange={(e) => setOfficeLat(e.target.value)} placeholder="e.g. 3.1390" inputMode="decimal" />
        </div>
        <div>
          <label style={labelStyle}>Longitude</label>
          <input style={inputStyle} value={officeLng} onChange={(e) => setOfficeLng(e.target.value)} placeholder="e.g. 101.6869" inputMode="decimal" />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Allowed Radius (meters)</label>
        <input style={inputStyle} value={officeRadiusM} onChange={(e) => setOfficeRadiusM(e.target.value)} inputMode="numeric" />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '8px 22px', backgroundColor: 'var(--apex-navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span style={{ fontSize: 12, color: 'var(--apex-green)', fontWeight: 600 }}>Saved</span>}
      </div>
    </div>
  )
}
