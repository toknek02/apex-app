import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ProjectInfoForm } from '@/components/system/project-info-form'
import { ProjectTeamForm } from '@/components/system/project-team-form'
import { DeleteProjectButton } from '@/components/system/delete-project-button'
import { formatDuration } from '@/lib/project-duration'
import { PROJECT_STATUS_STYLES } from '@/lib/project-statuses'
import { attributeEntryCosts } from '@/lib/entry-cost'
import { formatCurrency } from '@/lib/payroll'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('MANAGE_PROJECTS')
  const { id } = await params

  const [project, staff, entries] = await Promise.all([
    prisma.project.findUnique({ where: { id }, include: { members: { select: { userId: true } } } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, department: true } }),
    prisma.timesheetEntry.findMany({
      where: { projectId: id },
      select: { id: true, userId: true, date: true, normalMins: true, otMins: true, basicSalaryAtEntry: true, user: { select: { name: true, department: true, basicSalary: true } } },
    }),
  ])
  if (!project) redirect('/staff/project')

  const basicSalaryByUserId = new Map(entries.map((e) => [e.userId, e.user.basicSalary]))
  const costs = await attributeEntryCosts(entries, basicSalaryByUserId)

  const byStaff = new Map<string, { name: string; department: string | null; normalMins: number; otMins: number; cost: number }>()
  for (const e of entries) {
    if (!byStaff.has(e.userId)) byStaff.set(e.userId, { name: e.user.name, department: e.user.department, normalMins: 0, otMins: 0, cost: 0 })
    const s = byStaff.get(e.userId)!
    s.normalMins += e.normalMins
    s.otMins += e.otMins
    s.cost += costs.get(e.id)?.totalCost ?? 0
  }
  const totalNormalMins = entries.reduce((sum, e) => sum + e.normalMins, 0)
  const totalOtMins = entries.reduce((sum, e) => sum + e.otMins, 0)
  const totalCost = [...byStaff.values()].reduce((sum, s) => sum + s.cost, 0)

  const s = PROJECT_STATUS_STYLES[project.status] ?? PROJECT_STATUS_STYLES.Active

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Project', project.code]} />

      <div style={{ maxWidth: 560, margin: '0 auto 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>
            {project.code} — {project.shortName}
          </h1>
          <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, backgroundColor: s.bg, color: s.color }}>
            {project.status}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--apex-muted)' }}>
          {project.client ? `${project.client} · ` : ''}
          {formatDuration(project.startDate, project.completedAt)}
        </p>
      </div>

      <ProjectInfoForm
        project={{
          id: project.id,
          shortName: project.shortName,
          title: project.title,
          status: project.status,
          access: project.access,
          offices: project.offices,
          client: project.client,
          description: project.description,
          startDate: project.startDate ? project.startDate.toISOString() : null,
          completedAt: project.completedAt ? project.completedAt.toISOString() : null,
        }}
      />

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 560, margin: '0 auto 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Hours &amp; Cost Estimate (all time)</h2>
        {byStaff.size === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--apex-muted)' }}>No timesheet entries logged against this project yet.</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid var(--apex-border)' }}>Staff</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid var(--apex-border)' }}>Normal</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid var(--apex-border)' }}>OT</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {[...byStaff.values()].map((row) => (
                  <tr key={row.name}>
                    <td style={{ padding: '6px 8px', borderRight: '1px solid var(--apex-border)' }}>
                      {row.name}
                      {row.department && <span style={{ color: 'var(--apex-muted)', fontSize: 11 }}> ({row.department})</span>}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid var(--apex-border)' }}>{(row.normalMins / 60).toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid var(--apex-border)' }}>{(row.otMins / 60).toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(row.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ padding: '8px 8px', fontWeight: 700, borderRight: '1px solid var(--apex-border)' }}>Total</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, borderRight: '1px solid var(--apex-border)' }}>{(totalNormalMins / 60).toFixed(2)}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, borderRight: '1px solid var(--apex-border)' }}>{(totalOtMins / 60).toFixed(2)}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
            <p style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 10 }}>
              Estimate only — based on each staff member's Basic Salary and the OT rate rules. For a filterable date-range report, use Timesheet &gt; Reports.
            </p>
          </>
        )}
      </div>

      <ProjectTeamForm projectId={project.id} staff={staff} initialMemberUserIds={project.members.map((m) => m.userId)} />

      <div style={{ maxWidth: 560, margin: '20px auto 0', display: 'flex', justifyContent: 'center' }}>
        <DeleteProjectButton projectId={project.id} redirectTo="/staff/project" />
      </div>
    </AppShell>
  )
}
