'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users } from 'lucide-react'
import { DeleteProjectButton } from '@/components/system/delete-project-button'
import { PROJECT_STATUS_STYLES } from '@/lib/project-statuses'

type ProjectRow = {
  id: string
  code: string
  shortName: string
  status: string
  access: string
  memberCount: number
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}

export function ProjectListTable({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => p.code.toLowerCase().includes(q) || p.shortName.toLowerCase().includes(q))
  }, [projects, search])

  return (
    <>
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search size={14} color="var(--apex-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
        <input
          style={{ ...inputStyle, paddingLeft: 32 }}
          placeholder="Search by code or short name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Project', 'Short Name', 'Status', 'Access', 'Team', 'Actions'].map((h) => (
                <th key={h} style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>
                  No projects match &ldquo;{search}&rdquo;.
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => {
                const s = PROJECT_STATUS_STYLES[p.status] ?? PROJECT_STATUS_STYLES.Active
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/staff/project/${p.id}`)}
                    style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff', cursor: 'pointer' }}
                  >
                    <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-accent)', fontWeight: 600 }}>{p.code}</td>
                    <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>{p.shortName || '—'}</td>
                    <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                      <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.color }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{p.access}</td>
                    <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--apex-text)' }}>
                        <Users size={13} color="var(--apex-accent)" />
                        {p.memberCount}
                      </span>
                    </td>
                    <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                      <DeleteProjectButton projectId={p.id} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
