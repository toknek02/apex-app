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

type User = {
  id: string
  name: string
  email: string
  department: string | null
  designation: string | null
  role: string
  isActive: boolean
}

export function UserModal({ user, trigger }: { user?: User; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [designation, setDesignation] = useState(user?.designation ?? '')
  const [role, setRole] = useState(user?.role ?? 'STAFF')
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    if (!name.trim() || (!user && !email.trim())) {
      setError('Name and email are required')
      return
    }
    if (!user && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (user && password && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    const res = await fetch(user ? `/api/staff/${user.id}` : '/api/staff', {
      method: user ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        user
          ? { name, department, designation, role, isActive, ...(password ? { password } : {}) }
          : { name, email, password, department, designation, role }
      ),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      setPassword('')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save user')
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
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{user ? 'Edit User' : 'New Staff'}</h2>

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
              <input
                type="email"
                style={{ ...inputStyle, ...(user ? { backgroundColor: 'var(--apex-row-alt)', color: 'var(--apex-muted)' } : {}) }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={Boolean(user)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{user ? 'Reset Password (leave blank to keep unchanged)' : 'Password'}</label>
              <input
                type="password"
                style={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={user ? '••••••••' : 'At least 6 characters'}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Department</label>
              <input style={inputStyle} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. ARCHITECT (DESIGN)" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Designation</label>
              <input style={inputStyle} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Architect" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {user && (
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={isActive ? 'active' : 'inactive'} onChange={(e) => setIsActive(e.target.value === 'active')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (cannot log in)</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: user ? 0 : 20 }}>
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
