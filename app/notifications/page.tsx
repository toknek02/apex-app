import { requireUser } from '@/lib/rbac'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { NotificationsList } from '@/components/notifications/notifications-list'

export default async function NotificationsPage() {
  const user = await requireUser()

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Notifications']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Notifications</h1>
      <NotificationsList />
    </AppShell>
  )
}
