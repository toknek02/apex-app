'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Pencil, Search, Users } from 'lucide-react'
import { ProjectModal } from '@/components/system/project-modal'
import { DeleteProjectButton } from '@/components/system/delete-project-button'

type ProjectRow = {
  id: string
  code: string
  title: string
  status: string
  access: string
  memberCount: number
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'var(--apex-green-lt)', color: 'var(--apex-green)' },
  Archived: { bg: 'var(--apex-row-alt)', color: 'var(--apex-muted)' },
  Suspended: { bg: 'var(--apex-red-lt)', color: 'var(--apex-red)' },
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}

export function ProjectListTable({ projects }: { projects: ProjectRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
  }, [projects, search])

  return (
    <>
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search size={14} color="var(--apex-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
        <input
          style={{ ...inputStyle, paddingLeft: 32 }}
          placeholder="Search by code or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Project', 'Title', 'Status', 'Access', 'Team', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
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
                const s = STATUS_STYLES[p.status] ?? STATUS_STYLES.Active
                return (
                  <tr key={p.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>{p.code}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>{p.title || '—'}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>
                      <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.color }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{p.access}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>
                      <Link
                        href={`/system/project/${p.id}/team`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--apex-text)', textDecoration: 'none' }}
                        title="Assign team"
                      >
                        <Users size={13} color="var(--apex-accent)" />
                        {p.memberCount}
                      </Link>
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <ProjectModal project={p} trigger={<Pencil size={14} color="var(--apex-accent)" />} />
                        <DeleteProjectButton projectId={p.id} />
                      </div>
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
