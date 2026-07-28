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

export function NewStaffModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [role, setRole] = useState('STAFF')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required')
      return
    }
    setSaving(true)
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, department, designation, role }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      setName('')
      setEmail('')
      setDepartment('')
      setDesignation('')
      setRole('STAFF')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create staff')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ padding: '8px 16px', backgroundColor: 'var(--apex-accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >
        New Staff
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderRadius: 10, padding: 24, width: 400 }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>New Staff</h2>

            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Department</label>
              <input style={inputStyle} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. ARCHITECT (DESIGN)" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Designation</label>
              <input style={inputStyle} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Architect" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
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
