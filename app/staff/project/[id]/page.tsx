import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ProjectInfoForm } from '@/components/system/project-info-form'
import { ProjectTeamForm } from '@/components/system/project-team-form'
import { ProjectDetailTabs } from '@/components/system/project-detail-tabs'
import { DeleteProjectButton } from '@/components/system/delete-project-button'
import { formatDuration } from '@/lib/project-duration'
import { PROJECT_STATUS_STYLES } from '@/lib/project-statuses'
import { attributeEntryCosts } from '@/lib/entry-cost'
import { formatCurrency } from '@/lib/payroll'
import { parseLocalDate } from '@/lib/date-utils'
import { STAGES } from '@/lib/logbook-stages'

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; from?: string; to?: string; stage?: string }>
}) {
  const user = await requirePermission('MANAGE_PROJECTS')
  const { id } = await params
  const sp = await searchParams
  const activeTab = sp.tab === 'cost' ? 'cost' : sp.tab === 'team' ? 'team' : 'details'

  const fromDate = sp.from ? parseLocalDate(sp.from) : null
  const toDate = sp.to ? parseLocalDate(sp.to) : null
  const dateFilterInvalid = Boolean((sp.from && !fromDate) || (sp.to && !toDate) || (fromDate && toDate && toDate.getTime() < fromDate.getTime()))
  const stageFilter = sp.stage && STAGES.includes(sp.stage) ? sp.stage : ''

  const [project, staff, entries] = await Promise.all([
    prisma.project.findUnique({ where: { id }, include: { members: { select: { userId: true } } } }),
    activeTab === 'team'
      ? prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, department: true } })
      : Promise.resolve([]),
    activeTab === 'cost' && !dateFilterInvalid
      ? prisma.timesheetEntry.findMany({
          where: {
            projectId: id,
            ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
            ...(stageFilter ? { stage: stageFilter } : {}),
          },
          select: { id: true, userId: true, date: true, normalMins: true, otMins: true, basicSalaryAtEntry: true, user: { select: { name: true, department: true, basicSalary: true } } },
        })
      : Promise.resolve([]),
  ])
  if (!project) redirect('/staff/project')

  const basicSalaryByUserId = new Map(entries.map((e) => [e.userId, e.user.basicSalary]))
  // No-op (and no query) when entries is empty, e.g. on the Details tab.
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

      <ProjectDetailTabs projectId={project.id} active={activeTab} />

      {activeTab === 'details' && (
        <>
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

          <div style={{ maxWidth: 560, margin: '20px auto 0', display: 'flex', justifyContent: 'center' }}>
            <DeleteProjectButton projectId={project.id} redirectTo="/staff/project" />
          </div>
        </>
      )}

      {activeTab === 'team' && (
        <ProjectTeamForm projectId={project.id} staff={staff} initialMemberUserIds={project.members.map((m) => m.userId)} />
      )}

      {activeTab === 'cost' && (
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 560, margin: '0 auto 20px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
            Hours &amp; Cost Estimate {fromDate || toDate ? '' : '(all time)'}{stageFilter ? ` — ${stageFilter}` : ''}
          </h2>

          <form method="GET" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap' }}>
            <input type="hidden" name="tab" value="cost" />
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>From</label>
              <input
                type="date"
                name="from"
                defaultValue={sp.from ?? ''}
                style={{ padding: '7px 9px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>To</label>
              <input
                type="date"
                name="to"
                defaultValue={sp.to ?? ''}
                style={{ padding: '7px 9px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Stage</label>
              <select
                name="stage"
                defaultValue={stageFilter}
                style={{ padding: '7px 9px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12 }}
              >
                <option value="">All Stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              style={{ padding: '7px 16px', backgroundColor: 'var(--apex-navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Apply
            </button>
            {(sp.from || sp.to || stageFilter) && (
              <a
                href={`/staff/project/${project.id}?tab=cost`}
                style={{ padding: '7px 16px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12, color: 'var(--apex-text)', textDecoration: 'none' }}
              >
                Clear
              </a>
            )}
          </form>

          {dateFilterInvalid ? (
            <p style={{ fontSize: 12, color: 'var(--apex-red)' }}>Invalid date range — From must be on or before To.</p>
          ) : byStaff.size === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--apex-muted)' }}>No timesheet entries logged against this project{fromDate || toDate || stageFilter ? ' matching this filter' : ' yet'}.</p>
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
                Estimate only — based on each staff member's Basic Salary and the OT rate rules.
              </p>
            </>
          )}
        </div>
      )}
    </AppShell>
  )
}
