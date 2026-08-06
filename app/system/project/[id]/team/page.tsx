import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ProjectTeamForm } from '@/components/system/project-team-form'

export default async function ProjectTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('MANAGE_PROJECTS')
  const { id } = await params

  const [project, staff] = await Promise.all([
    prisma.project.findUnique({ where: { id }, include: { members: { select: { userId: true } } } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, department: true } }),
  ])
  if (!project) redirect('/system/project')

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Project', project.code, 'Team']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
        Assign Team — {project.code}
      </h1>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--apex-muted)', marginBottom: 20 }}>{project.title}</p>
      <ProjectTeamForm projectId={project.id} staff={staff} initialMemberUserIds={project.members.map((m) => m.userId)} />
    </AppShell>
  )
}
