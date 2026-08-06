import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ProjectModal } from '@/components/system/project-modal'
import { ProjectListTable } from '@/components/system/project-list-table'

export default async function ProjectPage() {
  const user = await requirePermission('MANAGE_PROJECTS')
  const projects = await prisma.project.findMany({
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

      <ProjectListTable projects={rows} />
    </AppShell>
  )
}
