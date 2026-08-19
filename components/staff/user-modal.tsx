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
  username: string | null
  email: string | null
  department: string | null
  designation: string | null
  roleId: string
  isActive: boolean
  basicSalary?: number | null
  otEligible?: boolean
  leaveGroupIds?: string[]
}

type RoleOption = { id: string; name: string }
type LeaveGroupOption = { id: string; name: string }

export function UserModal({ user, roles, leaveGroups, trigger }: { user?: User; roles: RoleOption[]; leaveGroups: LeaveGroupOption[]; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [designation, setDesignation] = useState(user?.designation ?? '')
  const [roleId, setRoleId] = useState(user?.roleId ?? roles[0]?.id ?? '')
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [basicSalary, setBasicSalary] = useState(user?.basicSalary?.toString() ?? '')
  const [otEligible, setOtEligible] = useState(user?.otEligible ?? false)
  const [leaveGroupIds, setLeaveGroupIds] = useState<Set<string>>(new Set(user?.leaveGroupIds ?? []))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleGroup(id: string) {
    setLeaveGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setError('')
    if (!name.trim()) {
      setError('Full Name is required')
      return
    }
    if (!user && !username.trim()) {
      setError('Name (used to log in) is required')
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
    if (otEligible && !Number(basicSalary)) {
      setError('Basic Salary is required for staff eligible for OT')
      return
    }

    setSaving(true)
    const res = await fetch(user ? `/api/staff/${user.id}` : '/api/staff', {
      method: user ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        user
          ? { name, username, email, department, designation, roleId, isActive, basicSalary, otEligible, leaveGroupIds: [...leaveGroupIds], ...(password ? { password } : {}) }
          : { name, username, email, password, department, designation, roleId, basicSalary, otEligible, leaveGroupIds: [...leaveGroupIds] }
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
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. azmi" />
              <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
                Short name used to log in. Set once by HR/Admin.
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional — can be added later"
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
              <label style={labelStyle}>Groups</label>
              {leaveGroups.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--apex-muted)' }}>No groups exist yet.</div>
              ) : (
                <div style={{ border: '1px solid var(--apex-border)', borderRadius: 6, maxHeight: 120, overflowY: 'auto' }}>
                  {leaveGroups.map((g) => (
                    <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 13, borderBottom: '1px solid var(--apex-border)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={leaveGroupIds.has(g.id)} onChange={() => toggleGroup(g.id)} />
                      {g.name}
                    </label>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
                Can belong to more than one — they'll pick which group to route each leave application through.
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Basic Salary (RM/month)</label>
              <input type="number" min="0" step="0.01" style={inputStyle} value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} placeholder="e.g. 4500.00" />
              <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
                Hourly and daily pay rates are derived from this (÷26 days, ÷8 hours) — used for normal pay and every OT formula.
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={otEligible} onChange={(e) => setOtEligible(e.target.checked)} />
                Eligible for Overtime (OT)
              </label>
              <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
                Only staff marked eligible see the OT option on their Timesheet.
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
