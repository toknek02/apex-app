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
  roleId: string
  isActive: boolean
  hourlyRate?: number | null
  otRate?: number | null
  leaveGroupId?: string | null
}

type RoleOption = { id: string; name: string }
type LeaveGroupOption = { id: string; name: string }

export function UserModal({ user, roles, leaveGroups, trigger }: { user?: User; roles: RoleOption[]; leaveGroups: LeaveGroupOption[]; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [designation, setDesignation] = useState(user?.designation ?? '')
  const [roleId, setRoleId] = useState(user?.roleId ?? roles[0]?.id ?? '')
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [hourlyRate, setHourlyRate] = useState(user?.hourlyRate?.toString() ?? '')
  const [otRate, setOtRate] = useState(user?.otRate?.toString() ?? '')
  const [leaveGroupId, setLeaveGroupId] = useState(user?.leaveGroupId ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    if (!name.trim() || (!user && !email.trim())) {
      setError('Name and email are required')
      return
    }
    if (!roleId) {
      setError('A role must be selected')
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
          ? { name, department, designation, roleId, isActive, hourlyRate, otRate, leaveGroupId, ...(password ? { password } : {}) }
          : { name, email, password, department, designation, roleId, hourlyRate, otRate, leaveGroupId }
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
              <select style={inputStyle} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Leave Group</label>
              <select style={inputStyle} value={leaveGroupId} onChange={(e) => setLeaveGroupId(e.target.value)}>
                <option value="">— None —</option>
                {leaveGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Hourly Rate (RM/hr)</label>
                <input type="number" min="0" step="0.01" style={inputStyle} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 25.00" />
              </div>
              <div>
                <label style={labelStyle}>OT Rate (RM/hr)</label>
                <input type="number" min="0" step="0.01" style={inputStyle} value={otRate} onChange={(e) => setOtRate(e.target.value)} placeholder="e.g. 37.50" />
              </div>
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
