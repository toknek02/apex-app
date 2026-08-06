import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { TimesheetReportForm } from '@/components/staff/timesheet-report-form'

export default async function TimesheetReportsPage() {
  const user = await requireUser()
  const canViewTeamReports = hasPermission(user, 'VIEW_TIMESHEET_REPORTS')
  const canManageEntries = hasPermission(user, 'MANAGE_TIMESHEET_ENTRIES')
  const projects = await prisma.project.findMany({ orderBy: { code: 'asc' } })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Timesheet', 'Reports']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
        Monthly Staff/Project Timesheet Reports
      </h1>
      <TimesheetReportForm
        staffName={user.name ?? ''}
        projects={projects}
        canViewTeamReports={canViewTeamReports}
        canManageEntries={canManageEntries}
      />
    </AppShell>
  )
}
