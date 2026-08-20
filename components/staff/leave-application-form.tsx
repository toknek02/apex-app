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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--apex-border)', fontSize: 13 }}>
      <span style={{ color: 'var(--apex-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_ARCHITECT: 'Pending — Architect Review',
  PENDING_DIRECTOR: 'Pending — Director Review',
}

type Project = { id: string; code: string; shortName: string }
type LeaveGroupOption = { id: string; name: string }
type Submitted = {
  leaveType: string
  startDate: string
  endDate: string
  dayPortion: 'FULL' | 'AM' | 'PM'
  reason: string
  projectLabel: string | null
  groupLabel: string | null
  status: string
  warning: string | null
}

export function LeaveApplicationForm({
  projects,
  leaveGroups,
  annualLeaveRemaining,
}: {
  projects: Project[]
  leaveGroups: LeaveGroupOption[]
  // Null means HR hasn't set an entitlement for this person yet — Annual
  // Leave is left unrestricted in that case, so no balance line is shown.
  annualLeaveRemaining: number | null
}) {
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
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<Submitted | null>(null)

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
      const project = projects.find((p) => p.id === projectId)
      const group = leaveGroups.find((g) => g.id === (leaveGroupId || leaveGroups[0]?.id))
      setSubmitted({
        leaveType,
        startDate,
        endDate,
        dayPortion,
        reason,
        projectLabel: project ? `${project.code} — ${project.shortName}` : null,
        groupLabel: group?.name ?? null,
        status: data.application.status,
        warning: data.warning ?? null,
      })
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setErrors([data.error ?? 'Failed to submit leave application'])
    }
  }

  function applyAnother() {
    setSubmitted(null)
    setLeaveType(LEAVE_EVENT_TYPES[0])
    setStartDate(today)
    setEndDate(today)
    setDayLength('FULL')
    setProjectId('')
    setReason('')
    setErrors([])
  }

  if (submitted) {
    const isHalfDay = submitted.dayPortion !== 'FULL'
    const dateLabel = submitted.startDate === submitted.endDate
      ? fmtDate(submitted.startDate)
      : `${fmtDate(submitted.startDate)} – ${fmtDate(submitted.endDate)}`

    return (
      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Application Submitted</h2>
        </div>

        {submitted.warning && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--apex-accent-lt)', color: 'var(--apex-accent)', fontSize: 12 }}>
            {submitted.warning}
          </div>
        )}

        <DetailRow label="Leave Type" value={submitted.leaveType} />
        <DetailRow label="Dates" value={isHalfDay ? `${dateLabel} (${submitted.dayPortion} half-day)` : dateLabel} />
        {submitted.projectLabel && <DetailRow label="Project" value={submitted.projectLabel} />}
        {submitted.reason && <DetailRow label="Reason" value={submitted.reason} />}
        <DetailRow label="Routed To" value={submitted.groupLabel ?? 'HR (no group assigned)'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--apex-muted)' }}>Status</span>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--apex-accent)',
              backgroundColor: 'var(--apex-accent-lt)',
            }}
          >
            {STATUS_LABEL[submitted.status] ?? submitted.status}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            type="button"
            onClick={applyAnother}
            style={{ padding: '8px 16px', border: '1px solid var(--apex-border)', backgroundColor: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Apply for Another
          </button>
          <button
            type="button"
            onClick={() => router.push('/staff/leave')}
            style={{ padding: '8px 16px', border: 'none', backgroundColor: 'var(--apex-navy)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            View My Applications
          </button>
        </div>
      </div>
    )
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

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Leave Type<Required /></label>
        <select style={inputStyle} value={leaveType} onChange={(e) => handleLeaveTypeChange(e.target.value)}>
          {LEAVE_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {leaveType === 'Annual Leave' && annualLeaveRemaining !== null && (
          <div
            style={{
              fontSize: 11,
              marginTop: 5,
              color: annualLeaveRemaining <= 0 ? 'var(--apex-red)' : 'var(--apex-muted)',
              fontWeight: annualLeaveRemaining <= 0 ? 600 : 400,
            }}
          >
            {annualLeaveRemaining <= 0
              ? `You have ${annualLeaveRemaining} Annual Leave day(s) left this year — apply Unpaid Annual Leave instead.`
              : `${annualLeaveRemaining} day(s) of Annual Leave left this year.`}
          </div>
        )}
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
