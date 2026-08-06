'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

type Staff = { id: string; name: string; department: string | null }

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}

export function ProjectTeamForm({
  projectId,
  staff,
  initialMemberUserIds,
}: {
  projectId: string
  staff: Staff[]
  initialMemberUserIds: string[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string[]>(initialMemberUserIds)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return staff
    return staff.filter((s) => s.name.toLowerCase().includes(q) || (s.department ?? '').toLowerCase().includes(q))
  }, [staff, search])

  function toggleStaff(userId: string) {
    setSaved(false)
    setSelectedStaff((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  async function handleSave() {
    setError('')
    setSaved(false)
    setSaving(true)
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberUserIds: selectedStaff }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save team assignment')
    }
  }

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={14} color="var(--apex-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
        <input
          style={{ ...inputStyle, paddingLeft: 32 }}
          placeholder="Search staff by name or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600 }}>{selectedStaff.length} assigned</div>

      <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--apex-border)', borderRadius: 6, padding: '4px 10px', marginBottom: 20 }}>
        {filteredStaff.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--apex-muted)', padding: '10px 0' }}>No staff match &ldquo;{search}&rdquo;.</p>
        ) : (
          filteredStaff.map((s) => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedStaff.includes(s.id)} onChange={() => toggleStaff(s.id)} />
              {s.name}
              {s.department && <span style={{ color: 'var(--apex-muted)', fontSize: 11 }}>({s.department})</span>}
            </label>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '8px 22px', backgroundColor: 'var(--apex-navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Team'}
        </button>
        {saved && <span style={{ fontSize: 12, color: 'var(--apex-green)', fontWeight: 600 }}>Saved</span>}
      </div>
    </div>
  )
}
