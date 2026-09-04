import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { TimesheetEntryForm } from '@/components/staff/timesheet-entry-form'

export default async function NewTimesheetEntryPage() {
  const user = await requireUser()
  const [projects, dbUser] = await Promise.all([
    prisma.project.findMany({
      // Any active project, not just ones the user is a member of — with 591
      // active jobs, keeping team lists current just to unblock timesheets was
      // more admin work than the restriction was worth.
      where: { status: 'Active' },
      orderBy: { code: 'asc' },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { otEligible: true } }),
  ])

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Timesheet', 'New Entry']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Add To TimeSheet</h1>
      <TimesheetEntryForm projects={projects} otEligible={dbUser?.otEligible ?? false} />
    </AppShell>
  )
}
