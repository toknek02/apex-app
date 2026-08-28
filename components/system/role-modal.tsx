'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PermissionMeta } from '@/lib/permissions'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

type Role = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  rolePermissions: { permission: { code: string } }[]
}

export function RoleModal({ role, allPermissions, trigger }: { role?: Role; allPermissions: PermissionMeta[]; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [codes, setCodes] = useState<string[]>(role?.rolePermissions.map((rp) => rp.permission.code) ?? [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const locked = Boolean(role?.isSystem)

  function toggleCode(code: string) {
    setCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  async function handleSave() {
    setError('')
    if (!name.trim()) {
      setError('Role name is required')
      return
    }
    setSaving(true)
    const res = await fetch(role ? `/api/roles/${role.id}` : '/api/roles', {
      method: role ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, permissionCodes: codes }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save role')
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
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--apex-surface)', borderRadius: 10, padding: 24, width: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, flexShrink: 0 }}>{role ? 'Edit Role' : 'New Role'}</h2>
            {locked && (
              <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16, flexShrink: 0 }}>
                This is a protected role and cannot be edited or deleted.
              </p>
            )}

            {error && (
              <div style={{ marginTop: 12, marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12, flexShrink: 0 }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 16, marginBottom: 12, flexShrink: 0 }}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} disabled={locked} />
            </div>
            <div style={{ marginBottom: 16, flexShrink: 0 }}>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} value={description ?? ''} onChange={(e) => setDescription(e.target.value)} disabled={locked} />
            </div>

            <label style={{ ...labelStyle, flexShrink: 0 }}>Permissions</label>
            <div style={{ border: '1px solid var(--apex-border)', borderRadius: 6, padding: 10, marginBottom: 20, overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
              {allPermissions.map((p) => (
                <label key={p.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 2px' }}>
                  <input
                    type="checkbox"
                    checked={locked || codes.includes(p.code)}
                    onChange={() => toggleCode(p.code)}
                    disabled={locked}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--apex-muted)' }}>{p.description}</div>
                  </span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', border: '1px solid var(--apex-border)', backgroundColor: 'var(--apex-surface)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                {locked ? 'Close' : 'Cancel'}
              </button>
              {!locked && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '8px 16px', border: 'none', backgroundColor: 'var(--apex-navy)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
