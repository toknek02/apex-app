import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { LeaveApplicationForm } from '@/components/staff/leave-application-form'
import { getAnnualLeaveBalance } from '@/lib/leave-balance'

export default async function NewLeaveApplicationPage() {
  const user = await requireUser()
  const [projects, leaveGroups, annualLeaveBalance] = await Promise.all([
    prisma.project.findMany({
      where: { status: 'Active', members: { some: { userId: user.id } } },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, shortName: true },
    }),
    prisma.leaveGroup.findMany({
      where: { memberships: { some: { userId: user.id } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    getAnnualLeaveBalance(user.id),
  ])

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Leave', 'New Application']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Apply for Leave</h1>
      <LeaveApplicationForm projects={projects} leaveGroups={leaveGroups} annualLeaveRemaining={annualLeaveBalance.remaining} />
    </AppShell>
  )
}
