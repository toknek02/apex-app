import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { TimesheetEntryForm } from '@/components/staff/timesheet-entry-form'

export default async function NewTimesheetEntryPage() {
  const user = await requireUser()
  const [projects, dbUser] = await Promise.all([
    prisma.project.findMany({
      where: { status: 'Active', members: { some: { userId: user.id } } },
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
