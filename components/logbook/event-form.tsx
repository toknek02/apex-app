'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Staff = { id: string; name: string; department: string | null }
type Venue = { id: string; description: string }
type Project = { id: string; code: string; shortName: string }

type ExistingEvent = {
  id: string
  title: string
  date: string
  durationMins: number | null
  stage: string | null
  task: string | null
  venueId: string | null
  externalVenue: string | null
  projectId: string | null
  resources: string | null
  remarks: string | null
  repeat: boolean
  private: boolean
  remindMe: boolean
  attendeeIds: string[]
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

function Required() {
  return <span style={{ color: 'var(--apex-red)' }}> *</span>
}

const MAX_REPEAT_OCCURRENCES = 365

const DURATION_OPTIONS = [
  { mins: 15, label: '15 mins' },
  { mins: 30, label: '30 mins' },
  { mins: 45, label: '45 mins' },
  { mins: 60, label: '1 hour' },
  { mins: 90, label: '1.5 hours' },
  { mins: 120, label: '2 hours' },
  { mins: 240, label: '4 hours' },
  { mins: 480, label: '8 hours' },
]

// The title an event gets pre-filled with when a project is picked.
function projectTitle(project?: Project) {
  return project ? `${project.code} — ${project.shortName}` : ''
}

function repeatStepMs(frequency: 'daily' | 'weekly') {
  return (frequency === 'weekly' ? 7 : 1) * 24 * 60 * 60 * 1000
}

function countRepeatOccurrences(startDate: string, time: string, untilDate: string, frequency: 'daily' | 'weekly') {
  const startMs = new Date(`${startDate}T${time}:00`).getTime()
  const untilMs = new Date(`${untilDate}T${time}:00`).getTime()
  if (untilMs < startMs) return 0
  return Math.floor((untilMs - startMs) / repeatStepMs(frequency)) + 1
}

function buildRepeatDates(startDate: string, time: string, untilDate: string, frequency: 'daily' | 'weekly') {
  const step = repeatStepMs(frequency)
  const untilMs = new Date(`${untilDate}T${time}:00`).getTime()
  const dates: string[] = []
  let cursorMs = new Date(`${startDate}T${time}:00`).getTime()
  while (cursorMs <= untilMs && dates.length < MAX_REPEAT_OCCURRENCES) {
    dates.push(new Date(cursorMs).toISOString())
    cursorMs += step
  }
  return dates
}

export function EventForm({
  currentUserId,
  staff,
  venues,
  projects,
  resources,
  stages,
  tasks,
  event,
}: {
  currentUserId: string
  staff: Staff[]
  venues: Venue[]
  projects: Project[]
  resources: string[]
  stages: string[]
  tasks: string[]
  event?: ExistingEvent
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const eventDate = event ? new Date(event.date) : null

  const [title, setTitle] = useState(event?.title ?? '')
  const [attendeeIds, setAttendeeIds] = useState<string[]>(event?.attendeeIds ?? [currentUserId])
  const [projectId, setProjectId] = useState(event?.projectId ?? '')
  const [stage, setStage] = useState(event?.stage ?? '')
  const [task, setTask] = useState(event?.task ?? '')
  const [date, setDate] = useState(eventDate ? eventDate.toISOString().slice(0, 10) : today)
  const [time, setTime] = useState(eventDate ? eventDate.toTimeString().slice(0, 5) : '09:00')
  const [durationMins, setDurationMins] = useState(String(event?.durationMins ?? 60))
  // An existing event whose duration isn't one of the presets (set via Custom
  // previously) has to reopen in custom mode, or its value would be lost.
  const [customDuration, setCustomDuration] = useState(
    Boolean(event?.durationMins && !DURATION_OPTIONS.some((o) => o.mins === event.durationMins))
  )
  const [venueId, setVenueId] = useState(event?.venueId ?? '')
  const [externalVenue, setExternalVenue] = useState(event?.externalVenue ?? '')
  const [selectedResources, setSelectedResources] = useState<string[]>(
    event?.resources ? event.resources.split(', ').filter(Boolean) : []
  )
  const [remarks, setRemarks] = useState(event?.remarks ?? '')
  const [repeat, setRepeat] = useState(event?.repeat ?? false)
  const [repeatUntil, setRepeatUntil] = useState('')
  const [repeatFrequency, setRepeatFrequency] = useState<'daily' | 'weekly'>('daily')
  const [isPrivate, setIsPrivate] = useState(event?.private ?? false)
  const [remindMe, setRemindMe] = useState(event?.remindMe ?? true)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const venueDesc = venues.find((v) => v.id === venueId)?.description ?? ''
  const showExternal = venueDesc === 'External Venue'

  // Picking a project pre-fills the title with its code and short name, but
  // must never clobber a title the user typed themselves. We only overwrite
  // when the box is empty or still holds the previous project's auto-title —
  // seeded here so an existing event opened for edit behaves the same way.
  const lastAutoTitle = useRef(
    title === projectTitle(projects.find((p) => p.id === projectId)) ? title : ''
  )

  function handleProjectChange(id: string) {
    const auto = projectTitle(projects.find((p) => p.id === id))
    setTitle((prev) => (prev.trim() === '' || prev === lastAutoTitle.current ? auto : prev))
    lastAutoTitle.current = auto
    setProjectId(id)
  }

  const staffByDept = new Map<string, Staff[]>()
  for (const s of staff) {
    const dept = s.department ?? 'UNASSIGNED'
    if (!staffByDept.has(dept)) staffByDept.set(dept, [])
    staffByDept.get(dept)!.push(s)
  }

  function toggleResource(name: string) {
    setSelectedResources((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]))
  }

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  function toggleDept(members: Staff[]) {
    const memberIds = members.map((m) => m.id)
    const allSelected = memberIds.every((id) => attendeeIds.includes(id))
    setAttendeeIds((prev) =>
      allSelected ? prev.filter((id) => !memberIds.includes(id)) : [...new Set([...prev, ...memberIds])]
    )
  }

  const isRepeating = repeat && !event

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const missing: string[] = []
    if (!title.trim()) missing.push('Title')
    if (attendeeIds.length === 0) missing.push('Staff')
    if (!date) missing.push('Date')
    if (!venueId && !showExternal) missing.push('Venue')
    if (customDuration && !(Number(durationMins) > 0)) missing.push('a Duration of at least 1 minute')

    let repeatDates: string[] | undefined
    if (isRepeating) {
      if (!repeatUntil) {
        missing.push('Repeat Until date')
      } else {
        const occurrences = countRepeatOccurrences(date, time, repeatUntil, repeatFrequency)
        if (occurrences === 0) {
          missing.push('Repeat Until date must be on or after the start date')
        } else if (occurrences > MAX_REPEAT_OCCURRENCES) {
          missing.push(`Repeat range too long — max ${MAX_REPEAT_OCCURRENCES} occurrences, shorten the Repeat Until date`)
        } else {
          repeatDates = buildRepeatDates(date, time, repeatUntil, repeatFrequency)
        }
      }
    }

    setErrors(missing)
    if (missing.length > 0) return

    setSubmitting(true)
    const res = await fetch(event ? `/api/events/${event.id}` : '/api/events', {
      method: event ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        date: new Date(`${date}T${time}:00`).toISOString(),
        ...(repeatDates ? { dates: repeatDates } : {}),
        durationMins,
        stage,
        task,
        venueId: venueId || null,
        externalVenue: showExternal ? externalVenue : null,
        projectId: projectId || null,
        resources: selectedResources.join(', '),
        remarks,
        repeat,
        private: isPrivate,
        remindMe,
        attendeeIds,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      router.push('/logbook')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setErrors([data.error ?? `Failed to ${event ? 'update' : 'create'} event`])
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 720, margin: '0 auto' }}
    >
      {errors.length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          Please fill in: {errors.join(', ')}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Title</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Staff<Required /></label>
        <div style={{ border: '1px solid var(--apex-border)', borderRadius: 6, padding: 10 }}>
          {[...staffByDept.entries()].map(([dept, members], i) => {
            const memberIds = members.map((m) => m.id)
            const allSelected = memberIds.every((id) => attendeeIds.includes(id))
            return (
              <div key={dept} style={{ marginTop: i === 0 ? 0 : 10 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--apex-border)',
                    paddingBottom: 4,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--apex-navy)' }}>Department: {dept}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <input type="checkbox" checked={allSelected} onChange={() => toggleDept(members)} />
                    All in this Dept
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {members.map((s) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <input type="checkbox" checked={attendeeIds.includes(s.id)} onChange={() => toggleAttendee(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-4 mb-4">
        <div>
          <label style={labelStyle}>Project</label>
          <select style={inputStyle} value={projectId} onChange={(e) => handleProjectChange(e.target.value)}>
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.shortName}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Stage</label>
          <select style={inputStyle} value={stage} onChange={(e) => setStage(e.target.value)}>
            {stages.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Task</label>
          <select style={inputStyle} value={task} onChange={(e) => setTask(e.target.value)}>
            {tasks.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: isRepeating ? 12 : 16 }}>
        <div>
          <label style={labelStyle}>{isRepeating ? 'Start Date' : 'Date'}<Required /></label>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Time</label>
          <input type="time" style={inputStyle} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Duration</label>
          <select
            style={inputStyle}
            value={customDuration ? 'custom' : durationMins}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustomDuration(true)
              } else {
                setCustomDuration(false)
                setDurationMins(e.target.value)
              }
            }}
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.mins} value={o.mins}>{o.label}</option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {customDuration && (
            <input
              type="number"
              min="1"
              style={{ ...inputStyle, marginTop: 6 }}
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
              placeholder="Minutes, e.g. 75"
            />
          )}
        </div>
      </div>

      {isRepeating && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4" style={{ padding: 12, backgroundColor: 'var(--apex-row-alt)', borderRadius: 6 }}>
          <div>
            <label style={labelStyle}>Repeat Until<Required /></label>
            <input type="date" style={inputStyle} min={date} value={repeatUntil} onChange={(e) => setRepeatUntil(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Frequency</label>
            <select style={inputStyle} value={repeatFrequency} onChange={(e) => setRepeatFrequency(e.target.value as 'daily' | 'weekly')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (same day)</option>
            </select>
          </div>
          {date && repeatUntil && (
            <p style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--apex-muted)', margin: 0 }}>
              {(() => {
                const n = countRepeatOccurrences(date, time, repeatUntil, repeatFrequency)
                return n > 0 ? `Will create ${n} event${n === 1 ? '' : 's'}, one per ${repeatFrequency === 'weekly' ? 'week' : 'day'} through ${repeatUntil}.` : 'Repeat Until must be on or after the start date.'
              })()}
            </p>
          )}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Venue<Required /></label>
        <select style={inputStyle} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
          <option value="">— Select —</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.description}</option>
          ))}
        </select>
      </div>

      {showExternal && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>For external events, kindly specify venue:</label>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={externalVenue} onChange={(e) => setExternalVenue(e.target.value)} />
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Resources</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {resources.map((r) => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input type="checkbox" checked={selectedResources.includes(r)} onChange={() => toggleResource(r)} />
              {r}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Remarks</label>
        <input style={inputStyle} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 18, marginBottom: 20, flexWrap: 'wrap' }}>
        {!event && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> Repeat
          </label>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={remindMe} onChange={(e) => setRemindMe(e.target.checked)} /> Remind Me
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '10px 22px',
          backgroundColor: 'var(--apex-navy)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? (event ? 'Saving…' : 'Adding…') : event ? 'Save Changes' : 'Add To Planner'}
      </button>
    </form>
  )
}
