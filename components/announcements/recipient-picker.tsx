'use client'

import { useState } from 'react'

type StaffOption = { id: string; name: string; department: string | null }

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

export function RecipientPicker({ staff, selected, onChange }: { staff: StaffOption[]; selected: Set<string>; onChange: (next: Set<string>) => void }) {
  const [everyone, setEveryone] = useState(selected.size === 0)

  const grouped = new Map<string, StaffOption[]>()
  for (const s of staff) {
    const dept = s.department ?? 'UNASSIGNED'
    if (!grouped.has(dept)) grouped.set(dept, [])
    grouped.get(dept)!.push(s)
  }

  function toggleEveryone(checked: boolean) {
    setEveryone(checked)
    if (checked) onChange(new Set())
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  function toggleDept(deptStaff: StaffOption[], checked: boolean) {
    const next = new Set(selected)
    for (const s of deptStaff) {
      if (checked) next.add(s.id)
      else next.delete(s.id)
    }
    onChange(next)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>Recipients</label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={everyone} onChange={(e) => toggleEveryone(e.target.checked)} />
        Send to Everyone
      </label>

      {!everyone && (
        <div style={{ border: '1px solid var(--apex-border)', borderRadius: 6, padding: 12, maxHeight: 320, overflowY: 'auto' }}>
          {[...grouped.entries()].map(([dept, members]) => {
            const allChecked = members.every((m) => selected.has(m.id))
            return (
              <div key={dept} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--apex-tbl-hdr)', letterSpacing: '0.04em' }}>DEPT: {dept}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--apex-muted)', cursor: 'pointer', marginLeft: 'auto' }}>
                    <input type="checkbox" checked={allChecked} onChange={(e) => toggleDept(members, e.target.checked)} />
                    All in this Dept
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                  {members.map((m) => (
                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleOne(m.id)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!everyone && selected.size === 0 && (
        <div style={{ fontSize: 11, color: 'var(--apex-red)', marginTop: 6 }}>Select at least one recipient, or check "Send to Everyone".</div>
      )}
    </div>
  )
}
