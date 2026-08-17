import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { AnnouncementForm } from '@/components/announcements/announcement-form'

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('MANAGE_ANNOUNCEMENTS')
  const { id } = await params

  const [announcement, staff] = await Promise.all([
    prisma.announcement.findUnique({ where: { id }, include: { recipients: { select: { userId: true } } } }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true },
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
    }),
  ])
  if (!announcement) redirect('/announcements')

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['Announcements', 'Edit']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Edit Announcement</h1>
      <AnnouncementForm
        announcement={{ id: announcement.id, title: announcement.title, body: announcement.body, recipientIds: announcement.recipients.map((r) => r.userId) }}
        staff={staff}
      />
    </AppShell>
  )
}
