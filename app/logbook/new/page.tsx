import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { EventForm } from '@/components/logbook/event-form'
import { RESOURCES } from '@/lib/logbook-resources'

export default async function NewEventPage() {
  const user = await requireUser()
  const [staff, venues, projects] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.venue.findMany({ orderBy: { description: 'asc' } }),
    prisma.project.findMany({ where: { status: 'Active' }, orderBy: { code: 'asc' } }),
  ])

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['LogBook', 'New Event']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>New Event</h1>
      <EventForm
        currentUserId={user.id}
        staff={staff}
        venues={venues}
        projects={projects}
        resources={RESOURCES}
      />
    </AppShell>
  )
}
