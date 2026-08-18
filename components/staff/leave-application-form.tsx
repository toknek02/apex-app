'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LEAVE_EVENT_TYPES, HALF_DAY_ELIGIBLE_LEAVE_TYPES } from '@/lib/timesheet-event-types'

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

type Project = { id: string; code: string; shortName: string }
type LeaveGroupOption = { id: string; name: string }

export function LeaveApplicationForm({ projects, leaveGroups }: { projects: Project[]; leaveGroups: LeaveGroupOption[] }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  const [leaveType, setLeaveType] = useState(LEAVE_EVENT_TYPES[0])
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [dayLength, setDayLength] = useState<'FULL' | 'HALF'>('FULL')
  const [halfPortion, setHalfPortion] = useState<'AM' | 'PM'>('AM')
  const [projectId, setProjectId] = useState('')
  const [leaveGroupId, setLeaveGroupId] = useState(leaveGroups[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [warning, setWarning] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const halfDayEligible = HALF_DAY_ELIGIBLE_LEAVE_TYPES.includes(leaveType)
  const dayPortion = dayLength === 'HALF' && halfDayEligible ? halfPortion : 'FULL'

  function handleLeaveTypeChange(value: string) {
    setLeaveType(value)
    if (!HALF_DAY_ELIGIBLE_LEAVE_TYPES.includes(value)) setDayLength('FULL')
  }

  function handleDayLengthChange(value: 'FULL' | 'HALF') {
    setDayLength(value)
    if (value === 'HALF') setEndDate(startDate)
  }

  function handleStartDateChange(value: string) {
    setStartDate(value)
    if (dayLength === 'HALF') setEndDate(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const missing: string[] = []
    if (!startDate) missing.push('Start Date')
    if (!endDate) missing.push('End Date')
    if (startDate && endDate && endDate < startDate) missing.push('End Date must be on or after Start Date')
    if (dayLength === 'HALF' && startDate && endDate && startDate !== endDate) missing.push('Half Day applications must be a single day')
    setErrors(missing)
    if (missing.length > 0) return

    setSubmitting(true)
    const res = await fetch('/api/leave-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaveType, startDate, endDate, reason, dayPortion, projectId: projectId || null, leaveGroupId: leaveGroupId || null }),
    })
    setSubmitting(false)
    if (res.ok) {
      const data = await res.json()
      if (data.warning) {
        setWarning(data.warning)
        setTimeout(() => {
          router.push('/staff/leave')
          router.refresh()
        }, 2500)
      } else {
        router.push('/staff/leave')
        router.refresh()
      }
    } else {
      const data = await res.json().catch(() => ({}))
      setErrors([data.error ?? 'Failed to submit leave application'])
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 560, margin: '0 auto' }}
    >
      {errors.length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          Please fill in: {errors.join(', ')}
        </div>
      )}
      {warning && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--apex-accent-lt)', color: 'var(--apex-accent)', fontSize: 12 }}>
          Application submitted. {warning}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Leave Type<Required /></label>
        <select style={inputStyle} value={leaveType} onChange={(e) => handleLeaveTypeChange(e.target.value)}>
          {LEAVE_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {leaveGroups.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Notify<Required /></label>
          <select style={inputStyle} value={leaveGroupId} onChange={(e) => setLeaveGroupId(e.target.value)}>
            {leaveGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
            You're in more than one group — pick which one should review this application.
          </div>
        </div>
      )}

      {halfDayEligible && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Duration<Required /></label>
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="radio" checked={dayLength === 'FULL'} onChange={() => handleDayLengthChange('FULL')} /> Full Day
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="radio" checked={dayLength === 'HALF'} onChange={() => handleDayLengthChange('HALF')} /> Half Day
            </label>
            {dayLength === 'HALF' && (
              <select style={{ ...inputStyle, width: 'auto' }} value={halfPortion} onChange={(e) => setHalfPortion(e.target.value as 'AM' | 'PM')}>
                <option value="AM">AM (9:00 – 13:00)</option>
                <option value="PM">PM (13:00 – 18:00)</option>
              </select>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Start Date<Required /></label>
          <input type="date" style={inputStyle} value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>End Date<Required /></label>
          <input type="date" style={inputStyle} value={endDate} disabled={dayLength === 'HALF'} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {projects.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Project</label>
          <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.shortName}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
            Optional — lets your approver see what work this leave affects.
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Reason</label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional — visible to your director and HR"
        />
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
        {submitting ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  )
}
