import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ProjectListTable } from '@/components/system/project-list-table'

export default async function ProjectArchivePage() {
  const user = await requirePermission('MANAGE_PROJECTS')
  const projects = await prisma.project.findMany({
    where: { status: 'Archived' },
    orderBy: { code: 'asc' },
    include: { _count: { select: { members: true } } },
  })

  const rows = projects.map((p) => ({
    id: p.id,
    code: p.code,
    title: p.title,
    status: p.status,
    access: p.access,
    memberCount: p._count.members,
  }))

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Project', 'Archive']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Project Archive</h1>
        <Link
          href="/staff/project"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--apex-text)', textDecoration: 'none' }}
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>
          No archived projects yet.
        </div>
      ) : (
        <ProjectListTable projects={rows} />
      )}
    </AppShell>
  )
}
