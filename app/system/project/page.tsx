import { Pencil } from 'lucide-react'
import { requireAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ProjectModal } from '@/components/system/project-modal'

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'var(--apex-green-lt)', color: 'var(--apex-green)' },
  Archived: { bg: 'var(--apex-row-alt)', color: 'var(--apex-muted)' },
  Suspended: { bg: 'var(--apex-red-lt)', color: 'var(--apex-red)' },
}

export default async function ProjectPage() {
  const user = await requireAdmin()
  const projects = await prisma.project.findMany({ orderBy: { code: 'asc' } })

  return (
    <AppShell user={{ name: user.name ?? '', role: user.role }}>
      <Breadcrumb items={['System', 'Project']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Project</h1>
        <ProjectModal
          trigger={
            <span style={{ padding: '8px 16px', backgroundColor: 'var(--apex-accent)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              Add Project
            </span>
          }
        />
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Project', 'Title', 'Status', 'Access', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
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
                    <ProjectModal project={p} trigger={<Pencil size={14} color="var(--apex-accent)" />} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
