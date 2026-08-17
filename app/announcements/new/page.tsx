import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { AnnouncementForm } from '@/components/announcements/announcement-form'

export default async function NewAnnouncementPage() {
  const user = await requirePermission('MANAGE_ANNOUNCEMENTS')

  const staff = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, department: true },
    orderBy: [{ department: 'asc' }, { name: 'asc' }],
  })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Announcements', 'New']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>New Announcement</h1>
      <AnnouncementForm staff={staff} />
    </AppShell>
  )
}
