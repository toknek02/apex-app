'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SELF_SERVICE_EVENT_TYPES } from '@/lib/timesheet-event-types'
import { STAGES } from '@/lib/logbook-stages'
import { TASKS } from '@/lib/logbook-tasks'

type Project = { id: string; code: string; shortName: string }

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

const HOURS = Array.from({ length: 13 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

export function TimesheetEntryForm({ projects, otEligible }: { projects: Project[]; otEligible: boolean }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  const [date, setDate] = useState(today)
  const [eventType, setEventType] = useState(SELF_SERVICE_EVENT_TYPES[0])
  const [projectId, setProjectId] = useState('')
  const [stage, setStage] = useState('')
  const [task, setTask] = useState('')
  const [normalHr, setNormalHr] = useState(0)
  const [normalMin, setNormalMin] = useState(0)
  const [otHr, setOtHr] = useState(0)
  const [otMin, setOtMin] = useState(0)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [remarks, setRemarks] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const isProjectWork = eventType === 'Project Work'
  const normalMins = normalHr * 60 + normalMin
  const otMins = otHr * 60 + otMin

  function timeToMins(t: string): number | null {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const missing: string[] = []
    if (!date) missing.push('Date')
    if (isProjectWork && !projectId) missing.push('Project')
    if ((startTime && !endTime) || (!startTime && endTime)) missing.push('Start Time and End Time (both or neither)')
    if (startTime && endTime && timeToMins(endTime)! <= timeToMins(startTime)!) missing.push('End Time must be after Start Time')
    setErrors(missing)
    if (missing.length > 0) return

    setSubmitting(true)
    const res = await fetch('/api/timesheet-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        eventType,
        projectId: isProjectWork ? projectId : null,
        stage: isProjectWork ? stage : null,
        task: isProjectWork ? task : null,
        normalMins,
        otMins,
        startMins: timeToMins(startTime),
        endMins: timeToMins(endTime),
        remarks,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      router.push('/staff/timesheet')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setErrors([data.error ?? 'Failed to add timesheet entry'])
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 640, margin: '0 auto' }}
    >
      {errors.length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          Please fill in: {errors.join(', ')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Date<Required /></label>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Event Type<Required /></label>
          <select style={inputStyle} value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {SELF_SERVICE_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
            Applying for leave? Use <a href="/staff/leave/new" style={{ color: 'var(--apex-accent)' }}>Staff → Leave</a> instead — it goes to your director for approval.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Project{isProjectWork && <Required />}</label>
          <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!isProjectWork}>
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.shortName}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Stage</label>
          <select style={inputStyle} value={stage} onChange={(e) => setStage(e.target.value)} disabled={!isProjectWork}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Task</label>
          <select style={inputStyle} value={task} onChange={(e) => setTask(e.target.value)} disabled={!isProjectWork}>
            {TASKS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Start Time</label>
          <input type="time" style={inputStyle} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>End Time</label>
          <input type="time" style={inputStyle} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: -12, marginBottom: 16 }}>
        Optional — set both to show this entry on the Activities Summary timeline.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: otEligible ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Hrs (Normal)<Required /></label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select style={inputStyle} value={normalHr} onChange={(e) => setNormalHr(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>{h} Hr</option>
              ))}
            </select>
            <select style={inputStyle} value={normalMin} onChange={(e) => setNormalMin(Number(e.target.value))}>
              {MINUTES.map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')} Min</option>
              ))}
            </select>
          </div>
        </div>
        {otEligible && (
          <div>
            <label style={labelStyle}>Hrs (OT)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select style={inputStyle} value={otHr} onChange={(e) => setOtHr(Number(e.target.value))}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{h} Hr</option>
                ))}
              </select>
              <select style={inputStyle} value={otMin} onChange={(e) => setOtMin(Number(e.target.value))}>
                {MINUTES.map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')} Min</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Remarks</label>
        <input style={inputStyle} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>

      <div style={{ marginBottom: 20, fontSize: 12, color: 'var(--apex-muted)', fontWeight: 600 }}>
        {otEligible ? `Total Hrs: ${(normalMins / 60).toFixed(2)} / ${(otMins / 60).toFixed(2)}` : `Total Hrs: ${(normalMins / 60).toFixed(2)}`}
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
        {submitting ? 'Adding…' : 'Add To TimeSheet'}
      </button>
    </form>
  )
}
