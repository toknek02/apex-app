import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { NewEventForm } from '@/components/logbook/new-event-form'

const RESOURCES = [
  'Camera-Olympus Digital',
  'Camera-Nikon Digital',
  'Camera-Nikon Auto',
  'Camera-Fuji Auto',
  'Perodua Alza',
  'Notebook-MAANB-018',
  'Notebook-MAANB-015',
  'Notebook-MAANB-016',
  'Notebook-MAANB-017',
  'Projector-Nec',
  'Projector-Epson',
]

export default async function NewEventPage() {
  const user = await requireUser()
  const [staff, venues, projects] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.venue.findMany({ orderBy: { description: 'asc' } }),
    prisma.project.findMany({ where: { status: 'Active' }, orderBy: { code: 'asc' } }),
  ])

  return (
    <AppShell user={{ name: user.name ?? '', role: user.role }}>
      <Breadcrumb items={['LogBook', 'New Event']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>New Event</h1>
      <NewEventForm
        currentUserId={user.id}
        staff={staff}
        venues={venues}
        projects={projects}
        resources={RESOURCES}
      />
    </AppShell>
  )
}
