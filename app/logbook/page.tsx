import Link from 'next/link'
import { Fragment } from 'react'
import { Pencil } from 'lucide-react'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { DeleteEventButton } from '@/components/logbook/delete-event-button'
import { EventDetailsModal } from '@/components/logbook/event-details-modal'

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getUTCDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // move back to Monday
  x.setUTCDate(x.getUTCDate() + diff)
  x.setUTCHours(0, 0, 0, 0)
  return x
}
function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}
function isSameDay(a: Date, b: Date) {
  return ymd(a) === ymd(b)
}

export default async function LogbookPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; scope?: string; start?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const view = sp.view === 'daily' ? 'daily' : 'weekly'
  const scope = sp.scope === 'mine' ? 'mine' : 'all'
  const start = sp.start ? new Date(sp.start) : new Date()

  const rangeStart = view === 'daily' ? new Date(new Date(start).setUTCHours(0, 0, 0, 0)) : startOfWeek(start)
  const rangeEnd = view === 'daily' ? new Date(rangeStart) : addDays(rangeStart, 6)
  rangeEnd.setUTCHours(23, 59, 59, 999)

  const canSeeAllPrivate = hasPermission(user, 'EDIT_ANY_EVENT')

  const events = await prisma.event.findMany({
    where: {
      date: { gte: rangeStart, lte: rangeEnd },
      ...(scope === 'mine' ? { attendees: { some: { userId: user.id } } } : {}),
      ...(scope === 'all' && !canSeeAllPrivate
        ? { OR: [{ private: false }, { createdById: user.id }, { attendees: { some: { userId: user.id } } }] }
        : {}),
    },
    include: {
      venue: true,
      attendees: { include: { user: { select: { id: true, name: true } } } },
      project: { select: { code: true, shortName: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  })

  const grouped = new Map<string, { date: Date; items: typeof events }>()
  for (const e of events) {
    const key = ymd(e.date)
    if (!grouped.has(key)) grouped.set(key, { date: e.date, items: [] })
    grouped.get(key)!.items.push(e)
  }

  // Always show every day in the range, even ones with no events.
  const days: { date: Date; items: typeof events }[] = []
  for (let d = new Date(rangeStart); d <= rangeEnd; d = addDays(d, 1)) {
    const key = ymd(d)
    days.push(grouped.get(key) ?? { date: new Date(d), items: [] })
  }

  const prevStart = ymd(addDays(rangeStart, view === 'daily' ? -1 : -7))
  const nextStart = ymd(addDays(rangeStart, view === 'daily' ? 1 : 7))
  const today = new Date()

  function toggleLink(overrides: Record<string, string>) {
    const params = new URLSearchParams({ view, scope, start: ymd(start), ...overrides })
    return `/logbook?${params.toString()}`
  }

  const Controls = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
      <Link href="/logbook/new" style={btnStyle(true)}>New</Link>
      <Link href="/logbook/find" style={btnStyle(false)}>Find</Link>

      <div style={toggleGroupStyle}>
        <Link href={toggleLink({ scope: 'mine' })} style={toggleItemStyle(scope === 'mine')}>My</Link>
        <Link href={toggleLink({ scope: 'all' })} style={toggleItemStyle(scope === 'all')}>All</Link>
      </div>
      <div style={toggleGroupStyle}>
        <Link href={toggleLink({ view: 'daily' })} style={toggleItemStyle(view === 'daily')}>Daily</Link>
        <Link href={toggleLink({ view: 'weekly' })} style={toggleItemStyle(view === 'weekly')}>Weekly</Link>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <Link href={toggleLink({ start: prevStart })} style={btnStyle(false)}>&lt; Previous</Link>
        <Link href={toggleLink({ start: nextStart })} style={btnStyle(false)}>Next &gt;</Link>
      </div>
    </div>
  )

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['LogBook']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Events</h1>

      <Controls />

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Date', 'Title', 'Venue', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((group) => {
              const key = ymd(group.date)
              const isToday = isSameDay(group.date, today)
              const dow = group.date.toLocaleDateString('en-GB', { weekday: 'long' })
              const dstr = group.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
              return (
                <Fragment key={key}>
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '7px 14px',
                        backgroundColor: 'var(--apex-accent-lt)',
                        fontSize: 12,
                        fontWeight: 700,
                        color: isToday ? 'var(--apex-accent)' : 'var(--apex-text)',
                      }}
                    >
                      {dstr}, {dow}
                    </td>
                  </tr>
                  {group.items.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)', fontStyle: 'italic' }}>
                        No events scheduled.
                      </td>
                    </tr>
                  )}
                  {group.items.map((e, i) => (
                    <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {e.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                        <EventDetailsModal
                          canEdit={e.createdById === user.id || hasPermission(user, 'EDIT_ANY_EVENT')}
                          event={{
                            id: e.id,
                            title: e.title,
                            date: e.date.toISOString(),
                            durationMins: e.durationMins,
                            stage: e.stage,
                            task: e.task,
                            venueName: e.venue?.description ?? null,
                            externalVenue: e.externalVenue,
                            project: e.project,
                            attendeeNames: e.attendees.map((a) => a.user.name),
                            createdByName: e.createdBy.name,
                            resources: e.resources,
                            remarks: e.remarks,
                            private: e.private,
                            remindMe: e.remindMe,
                          }}
                          trigger={
                            <span style={{ cursor: 'pointer' }}>
                              {e.attendees.map((a) => a.user.name).join(', ')}
                              {e.attendees.length > 0 ? ': ' : ''}
                              {e.title}
                            </span>
                          }
                        />
                      </td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>
                        {e.venue?.description ?? e.externalVenue ?? '—'}
                      </td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                        {e.date < today ? 'Past' : 'Upcoming'}
                      </td>
                      <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                        {(e.createdById === user.id || hasPermission(user, 'EDIT_ANY_EVENT')) && (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <Link href={`/logbook/${e.id}/edit`} style={{ display: 'inline-flex' }}>
                              <Pencil size={14} color="var(--apex-accent)" />
                            </Link>
                            <DeleteEventButton eventId={e.id} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        <Controls />
      </div>
    </AppShell>
  )
}

const toggleGroupStyle: React.CSSProperties = {
  display: 'flex',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  overflow: 'hidden',
}

function toggleItemStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 12,
    textDecoration: 'none',
    backgroundColor: active ? 'var(--apex-navy)' : '#fff',
    color: active ? '#fff' : 'var(--apex-text)',
    fontWeight: active ? 600 : 400,
  }
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: primary ? 600 : 400,
    textDecoration: 'none',
    border: `1px solid ${primary ? 'var(--apex-accent)' : 'var(--apex-border)'}`,
    backgroundColor: primary ? 'var(--apex-accent)' : '#fff',
    color: primary ? '#fff' : 'var(--apex-text)',
    cursor: 'pointer',
  }
}
