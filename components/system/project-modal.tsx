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

type Project = { id: string; code: string; title: string; status: string; access: string }

export function ProjectModal({ project, trigger }: { project?: Project; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(project?.code ?? '')
  const [title, setTitle] = useState(project?.title ?? '')
  const [status, setStatus] = useState(project?.status ?? 'Active')
  const [access, setAccess] = useState(project?.access ?? 'Team')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    if (!project && !code.trim()) {
      setError('Project code is required')
      return
    }
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    const res = await fetch(project ? `/api/projects/${project.id}` : '/api/projects', {
      method: project ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project ? { title, status, access } : { code, title, status, access }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save project')
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
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 24, width: 400 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{project ? 'Edit Project' : 'Add Project'}</h2>

            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Project Code</label>
              <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value)} disabled={Boolean(project)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Access</label>
              <select style={inputStyle} value={access} onChange={(e) => setAccess(e.target.value)}>
                <option value="Team">Team</option>
                <option value="Private">Private</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--apex-border)', backgroundColor: '#fff', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
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
