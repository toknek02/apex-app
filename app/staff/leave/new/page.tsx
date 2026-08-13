import { requireUser } from '@/lib/rbac'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { LeaveApplicationForm } from '@/components/staff/leave-application-form'

export default async function NewLeaveApplicationPage() {
  const user = await requireUser()

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Staff', 'Leave', 'New Application']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Apply for Leave</h1>
      <LeaveApplicationForm />
    </AppShell>
  )
}
