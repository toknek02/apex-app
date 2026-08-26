'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Plus } from 'lucide-react'

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
  const [department, setDepartment] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string[]>(initialMemberUserIds)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff])
  const departments = useMemo(
    () => [...new Set(staff.map((s) => s.department).filter((d): d is string => Boolean(d)))].sort(),
    [staff]
  )

  const currentMembers = useMemo(
    () =>
      selectedStaff
        .map((id) => staffById.get(id))
        .filter((s): s is Staff => Boolean(s))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [selectedStaff, staffById]
  )

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return staff.filter((s) => {
      if (selectedStaff.includes(s.id)) return false
      if (department && s.department !== department) return false
      if (q && !s.name.toLowerCase().includes(q) && !(s.department ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [staff, selectedStaff, search, department])

  function addStaff(userId: string) {
    setSaved(false)
    setSelectedStaff((prev) => (prev.includes(userId) ? prev : [...prev, userId]))
  }

  function removeStaff(userId: string) {
    setSaved(false)
    setSelectedStaff((prev) => prev.filter((id) => id !== userId))
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
      {error && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700 }}>Current Team ({currentMembers.length})</div>
      <div style={{ border: '1px solid var(--apex-border)', borderRadius: 6, marginBottom: 20, overflow: 'hidden' }}>
        {currentMembers.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--apex-muted)', padding: '12px 10px', margin: 0 }}>No team members assigned yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {currentMembers.map((s, i) => (
                <tr key={s.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                  <td style={{ padding: '7px 10px' }}>
                    {s.name}
                    {s.department && <span style={{ color: 'var(--apex-muted)', fontSize: 11 }}> ({s.department})</span>}
                  </td>
                  <td style={{ padding: '7px 10px', width: 32, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => removeStaff(s.id)}
                      title="Remove from team"
                      aria-label={`Remove ${s.name}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <X size={14} color="var(--apex-red)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700 }}>Add Team Member</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search size={14} color="var(--apex-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
          <input
            style={{ ...inputStyle, paddingLeft: 32 }}
            placeholder="Search staff by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <select style={inputStyle} value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--apex-border)', borderRadius: 6, marginBottom: 20, overflowX: 'hidden' }}>
        {candidates.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--apex-muted)', padding: '12px 10px', margin: 0 }}>
            {staff.length === selectedStaff.length ? 'Everyone is already on the team.' : 'No matching staff found.'}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {candidates.map((s, i) => (
                <tr key={s.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                  <td style={{ padding: '7px 10px' }}>
                    {s.name}
                    {s.department && <span style={{ color: 'var(--apex-muted)', fontSize: 11 }}> ({s.department})</span>}
                  </td>
                  <td style={{ padding: '7px 10px', width: 32, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => addStaff(s.id)}
                      title="Add to team"
                      aria-label={`Add ${s.name}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <Plus size={14} color="var(--apex-accent)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
