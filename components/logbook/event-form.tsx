'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Staff = { id: string; name: string; department: string | null }
type Venue = { id: string; description: string }
type Project = { id: string; code: string; title: string }

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
  const [venueId, setVenueId] = useState(event?.venueId ?? '')
  const [externalVenue, setExternalVenue] = useState(event?.externalVenue ?? '')
  const [selectedResources, setSelectedResources] = useState<string[]>(
    event?.resources ? event.resources.split(', ').filter(Boolean) : []
  )
  const [remarks, setRemarks] = useState(event?.remarks ?? '')
  const [repeat, setRepeat] = useState(event?.repeat ?? false)
  const [isPrivate, setIsPrivate] = useState(event?.private ?? false)
  const [remindMe, setRemindMe] = useState(event?.remindMe ?? true)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const venueDesc = venues.find((v) => v.id === venueId)?.description ?? ''
  const showExternal = venueDesc === 'External Venue'

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const missing: string[] = []
    if (!title.trim()) missing.push('Title')
    if (attendeeIds.length === 0) missing.push('Staff')
    if (!date) missing.push('Date')
    if (!venueId && !showExternal) missing.push('Venue')
    setErrors(missing)
    if (missing.length > 0) return

    setSubmitting(true)
    const res = await fetch(event ? `/api/events/${event.id}` : '/api/events', {
      method: event ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        date: new Date(`${date}T${time}:00`).toISOString(),
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
      style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 720, margin: '0 auto' }}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Project</label>
          <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.title}</option>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Date<Required /></label>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Time</label>
          <input type="time" style={inputStyle} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Duration (minutes)</label>
          <select style={inputStyle} value={durationMins} onChange={(e) => setDurationMins(e.target.value)}>
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>{m} mins</option>
            ))}
          </select>
        </div>
      </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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

      <div style={{ display: 'flex', gap: 18, marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> Repeat
        </label>
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
