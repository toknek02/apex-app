import Link from 'next/link'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ProjectModal } from '@/components/system/project-modal'
import { ProjectListTable } from '@/components/system/project-list-table'
import { PROJECT_STATUSES } from '@/lib/project-statuses'

export default async function ProjectPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePermission('MANAGE_PROJECTS')
  const { status: rawStatus } = await searchParams
  const activeTab = PROJECT_STATUSES.includes(rawStatus as (typeof PROJECT_STATUSES)[number]) ? rawStatus! : 'Active'

  const projects = await prisma.project.findMany({
    where: { status: activeTab },
    orderBy: { code: 'asc' },
    include: { _count: { select: { members: true } } },
  })

  const rows = projects.map((p) => ({
    id: p.id,
    code: p.code,
    shortName: p.shortName,
    status: p.status,
    access: p.access,
    memberCount: p._count.members,
  }))

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Project']} />
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

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--apex-border)' }}>
        {PROJECT_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/staff/project?status=${encodeURIComponent(s)}`}
            style={{
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              color: activeTab === s ? 'var(--apex-accent)' : 'var(--apex-muted)',
              borderBottom: activeTab === s ? '2px solid var(--apex-accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {s}
          </Link>
        ))}
      </div>

      <ProjectListTable projects={rows} />
    </AppShell>
  )
}
