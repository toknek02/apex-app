'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { DeleteEventButton } from '@/components/logbook/delete-event-button'

export type EventDetails = {
  id: string
  title: string
  date: string
  durationMins: number | null
  stage: string | null
  task: string | null
  venueName: string | null
  externalVenue: string | null
  project: { code: string; shortName: string } | null
  attendeeNames: string[]
  createdByName: string
  resources: string | null
  remarks: string | null
  private: boolean
  remindMe: boolean
}

const rowStyle: React.CSSProperties = { borderBottom: '1px solid var(--apex-border)' }
const labelCellStyle: React.CSSProperties = {
  padding: '9px 14px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--apex-muted)',
  width: 130,
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
}
const valueCellStyle: React.CSSProperties = { padding: '9px 14px', fontSize: 13, verticalAlign: 'top' }

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr style={rowStyle}>
      <td style={labelCellStyle}>{label}</td>
      <td style={valueCellStyle}>{value}</td>
    </tr>
  )
}

export function EventDetailsModal({ event, canEdit, trigger }: { event: EventDetails; canEdit: boolean; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const dateObj = new Date(event.date)
  const dateLabel = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeLabel = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const durationLabel = event.durationMins ? `${(event.durationMins / 60).toFixed(1)} hrs` : '—'
  const venueLabel = event.venueName ?? event.externalVenue ?? '—'
  const projectLabel = event.project ? (
    <>
      {event.project.code} — {event.project.shortName}
      {(event.stage || event.task) && (
        <span style={{ color: 'var(--apex-muted)' }}>
          {' '}
          ({[event.stage ? `Stage: ${event.stage}` : null, event.task ? `Task: ${event.task}` : null].filter(Boolean).join(', ')})
        </span>
      )}
    </>
  ) : (
    '—'
  )

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'block' }}>
        {trigger}
      </span>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--apex-surface)', borderRadius: 10, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--apex-border)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Event Details</h2>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <Row label="Title" value={event.title} />
                  <Row label="Project" value={projectLabel} />
                  <Row label="Date" value={dateLabel} />
                  <Row label="Time" value={timeLabel} />
                  <Row label="Duration" value={durationLabel} />
                  <Row label="Venue" value={venueLabel} />
                  <Row label="Staff" value={event.attendeeNames.length > 0 ? event.attendeeNames.join(', ') : '—'} />
                  <Row label="Planned By" value={event.createdByName} />
                  <Row label="Remarks" value={event.remarks || 'Nil'} />
                  <Row label="Resources" value={event.resources || 'Nil'} />
                  <Row label="Reminder" value={event.remindMe ? 'Yes' : 'No'} />
                  <Row label="Private" value={event.private ? 'Yes' : 'No'} />
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--apex-border)' }}>
              {canEdit && (
                <>
                  <Link
                    href={`/logbook/${event.id}/edit`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--apex-accent)', textDecoration: 'none' }}
                  >
                    <Pencil size={13} /> Edit
                  </Link>
                  <DeleteEventButton eventId={event.id} />
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ padding: '8px 16px', border: 'none', backgroundColor: 'var(--apex-navy)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
