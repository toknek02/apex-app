import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { NotificationsList } from '@/components/notifications/notifications-list'
import { NotificationPreferences } from '@/components/notifications/notification-preferences'

export default async function NotificationsPage() {
  const user = await requireUser()
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { mutedNotificationTypes: true } })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Notifications']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Notifications</h1>
      <NotificationPreferences initialMuted={dbUser?.mutedNotificationTypes ?? []} />
      <NotificationsList />
    </AppShell>
  )
}
