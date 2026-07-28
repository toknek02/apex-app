import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { FindEventsForm } from '@/components/logbook/find-events-form'

export default async function FindEventsPage() {
  const user = await requireUser()
  const [staff, venues, projects] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.venue.findMany({ orderBy: { description: 'asc' } }),
    prisma.project.findMany({ orderBy: { code: 'asc' } }),
  ])

  return (
    <AppShell user={{ name: user.name ?? '', role: user.role }}>
      <Breadcrumb items={['LogBook', 'Find Event']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Find Event</h1>
      <FindEventsForm staff={staff} venues={venues} projects={projects} />
    </AppShell>
  )
}
