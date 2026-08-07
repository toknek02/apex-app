import { redirect } from 'next/navigation'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { EventForm } from '@/components/logbook/event-form'
import { DeleteEventButton } from '@/components/logbook/delete-event-button'
import { RESOURCES } from '@/lib/logbook-resources'
import { STAGES } from '@/lib/logbook-stages'
import { TASKS } from '@/lib/logbook-tasks'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params

  const [event, staff, venues, projects] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { attendees: true } }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true },
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
    }),
    prisma.venue.findMany({ orderBy: { description: 'asc' } }),
    prisma.project.findMany({ where: { status: 'Active' }, orderBy: { code: 'asc' } }),
  ])

  if (!event) redirect('/logbook')

  const canEdit = event.createdById === user.id || hasPermission(user, 'EDIT_ANY_EVENT')
  if (!canEdit) redirect('/logbook')

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['LogBook', 'Edit Event']} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 720, margin: '0 auto 16px' }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Edit Event</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--apex-red)' }}>
          <DeleteEventButton eventId={event.id} redirectTo="/logbook" />
          Delete Event
        </div>
      </div>
      <EventForm
        currentUserId={user.id}
        staff={staff}
        venues={venues}
        projects={projects}
        resources={RESOURCES}
        stages={STAGES}
        tasks={TASKS}
        event={{
          id: event.id,
          title: event.title,
          date: event.date.toISOString(),
          durationMins: event.durationMins,
          stage: event.stage,
          task: event.task,
          venueId: event.venueId,
          externalVenue: event.externalVenue,
          projectId: event.projectId,
          resources: event.resources,
          remarks: event.remarks,
          repeat: event.repeat,
          private: event.private,
          remindMe: event.remindMe,
          attendeeIds: event.attendees.map((a) => a.userId),
        }}
      />
    </AppShell>
  )
}
