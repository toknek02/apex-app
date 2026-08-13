'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type StaffOption = { id: string; name: string; leaveGroupId: string | null }

export function LeaveGroupMembersModal({
  groupId,
  groupName,
  staff,
  currentMemberIds,
  trigger,
}: {
  groupId: string
  groupName: string
  staff: StaffOption[]
  currentMemberIds: string[]
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(currentMemberIds))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    const res = await fetch(`/api/leave-groups/${groupId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: [...selected] }),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save members')
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
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 24, width: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Members — {groupName}</h2>
            <p style={{ fontSize: 11, color: 'var(--apex-muted)', marginBottom: 12 }}>
              A staff member checked in another group here will be moved into this one — everyone belongs to at most one group.
            </p>

            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ overflowY: 'auto', border: '1px solid var(--apex-border)', borderRadius: 6, marginBottom: 16 }}>
              {staff.map((s) => {
                const inOtherGroup = s.leaveGroupId && s.leaveGroupId !== groupId && !selected.has(s.id)
                return (
                  <label
                    key={s.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, borderBottom: '1px solid var(--apex-border)', cursor: 'pointer' }}
                  >
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                    <span style={{ flex: 1 }}>{s.name}</span>
                    {inOtherGroup && <span style={{ fontSize: 10, color: 'var(--apex-muted)' }}>in another group</span>}
                  </label>
                )
              })}
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
