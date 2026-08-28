'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PROJECT_STATUSES } from '@/lib/project-statuses'
import { PROJECT_OFFICES } from '@/lib/project-offices'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

type ProjectDetail = {
  id: string
  shortName: string
  title: string
  status: string
  access: string
  offices: string[]
  client: string | null
  description: string | null
  startDate: string | null
  completedAt: string | null
}

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : ''
}

export function ProjectInfoForm({ project }: { project: ProjectDetail }) {
  const router = useRouter()
  const [shortName, setShortName] = useState(project.shortName)
  const [title, setTitle] = useState(project.title)
  const [status, setStatus] = useState(project.status)
  const [access, setAccess] = useState(project.access)
  const [offices, setOffices] = useState<string[]>(project.offices)
  const [client, setClient] = useState(project.client ?? '')
  const [description, setDescription] = useState(project.description ?? '')
  const [startDate, setStartDate] = useState(toDateInputValue(project.startDate))
  const [completedAt, setCompletedAt] = useState(toDateInputValue(project.completedAt))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleOffice(office: string) {
    setOffices((prev) => (prev.includes(office) ? prev.filter((o) => o !== office) : [...prev, office]))
  }

  async function handleSave() {
    setError('')
    setSaved(false)
    if (!shortName.trim()) {
      setError('Short name is required')
      return
    }
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shortName,
        title,
        status,
        access,
        offices,
        client,
        description,
        startDate: startDate || null,
        completedAt: completedAt || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save project')
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 560, margin: '0 auto 20px' }}>
      {error && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>*Title</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>*ShortName</label>
        <input style={inputStyle} value={shortName} onChange={(e) => setShortName(e.target.value)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Client</label>
        <input style={inputStyle} value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Lien Hoe Group" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Description</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief project notes…"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Access</label>
          <select style={inputStyle} value={access} onChange={(e) => setAccess(e.target.value)}>
            <option value="Team">Team</option>
            <option value="Private">Private</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Offices Involved</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PROJECT_OFFICES.map((office) => (
            <label key={office} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={offices.includes(office)} onChange={() => toggleOffice(office)} />
              {office}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Completed On</label>
          <input type="date" style={inputStyle} value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '8px 22px', backgroundColor: 'var(--apex-navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Details'}
        </button>
        {saved && <span style={{ fontSize: 12, color: 'var(--apex-green)', fontWeight: 600 }}>Saved</span>}
      </div>
    </div>
  )
}
