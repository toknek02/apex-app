'use client'

import { Fragment, useState } from 'react'
import { Trash2 } from 'lucide-react'

type Project = { id: string; code: string; title: string }
type EntryResult = {
  id: string
  userId: string
  date: string
  eventType: string
  project: { code: string; title: string } | null
  stage: string | null
  task: string | null
  normalMins: number
  otMins: number
  remarks: string | null
  user?: { id: string; name: string; department: string | null }
}
type Member = { id: string; name: string; department: string | null }

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthBounds() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: ymd(first), to: ymd(last) }
}

export function TimesheetReportForm({
  staffName,
  projects,
  canViewTeamReports,
  canManageEntries,
}: {
  staffName: string
  projects: Project[]
  canViewTeamReports: boolean
  canManageEntries: boolean
}) {
  const defaults = monthBounds()
  const [teamMode, setTeamMode] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [results, setResults] = useState<EntryResult[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const showActionsCol = teamMode && canManageEntries

  async function handleDeleteEntry(entryId: string) {
    if (!confirm('Delete this timesheet entry? This cannot be undone.')) return
    setDeletingId(entryId)
    const res = await fetch(`/api/timesheet-entries/${entryId}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      setResults((prev) => (prev ? prev.filter((e) => e.id !== entryId) : prev))
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to delete entry')
    }
  }

  function buildParams() {
    const params = new URLSearchParams()
    if (projectId) params.set('projectId', projectId)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (teamMode) params.set('scope', 'project')
    return params
  }

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault()
    if (teamMode && !projectId) {
      setError('Select a project to run a team cost report.')
      return
    }
    setError('')
    setLoading(true)
    const res = await fetch(`/api/timesheet-entries?${buildParams().toString()}`)
    const data = await res.json()
    setResults(data.entries ?? [])
    setMembers(data.members ?? [])
    setLoading(false)
  }

  function handleDownload() {
    const params = buildParams()
    params.set('format', 'xlsx')
    window.location.assign(`/api/timesheet-entries?${params.toString()}`)
  }

  function handleCancel() {
    setProjectId('')
    setFrom(defaults.from)
    setTo(defaults.to)
    setResults(null)
    setMembers([])
    setError('')
  }

  const totalNormalMins = (results ?? []).reduce((sum, e) => sum + e.normalMins, 0)
  const totalOtMins = (results ?? []).reduce((sum, e) => sum + e.otMins, 0)

  const byStaff = new Map<string, { name: string; department: string | null; entries: EntryResult[] }>()
  if (teamMode && results) {
    for (const m of members) {
      byStaff.set(m.id, { name: m.name, department: m.department, entries: [] })
    }
    for (const e of results) {
      const key = e.userId
      if (!byStaff.has(key)) byStaff.set(key, { name: e.user?.name ?? 'Unknown', department: e.user?.department ?? null, entries: [] })
      byStaff.get(key)!.entries.push(e)
    }
  }

  return (
    <>
      <form
        onSubmit={handleGenerate}
        style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 20, marginBottom: 20, maxWidth: 560, margin: '0 auto 20px' }}
      >
        {canViewTeamReports && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 16, fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" checked={!teamMode} onChange={() => { setTeamMode(false); setResults(null); setError('') }} />
              My Entries
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" checked={teamMode} onChange={() => { setTeamMode(true); setResults(null); setError('') }} />
              Team Cost Report (by Project)
            </label>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Project{teamMode && <span style={{ color: 'var(--apex-red)' }}> *</span>}</label>
          <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">{teamMode ? '— Select a Project —' : '— Any Project —'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.title}</option>
            ))}
          </select>
        </div>

        {!teamMode && (
          <div style={{ marginBottom: 16, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>Staff</span> {staffName}
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>From</label>
            <input type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>To</label>
            <input type="date" style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '8px 22px', backgroundColor: 'var(--apex-navy)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            style={{ padding: '8px 22px', backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Cancel
          </button>
          {results !== null && (
            <button
              type="button"
              onClick={handleDownload}
              style={{ padding: '8px 22px', backgroundColor: '#fff', border: '1px solid var(--apex-green)', color: 'var(--apex-green)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Download Excel
            </button>
          )}
        </div>
      </form>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {[...(teamMode ? ['Staff'] : []), 'Date', 'Event Type', 'Project', 'Stage / Task', 'Normal', 'OT', 'Remarks', ...(showActionsCol ? ['Actions'] : [])].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results === null && (
              <tr><td colSpan={teamMode ? (showActionsCol ? 9 : 8) : 7} style={{ padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>{loading ? 'Generating…' : 'Set your criteria and click Generate.'}</td></tr>
            )}
            {results?.length === 0 && byStaff.size === 0 && (
              <tr>
                <td colSpan={teamMode ? (showActionsCol ? 9 : 8) : 7} style={{ padding: 20, fontSize: 13, color: 'var(--apex-muted)' }}>
                  {teamMode ? 'No staff assigned to this project yet.' : 'No entries found for this range.'}
                </td>
              </tr>
            )}
            {!teamMode && results?.map((e, i) => (
              <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                <td style={{ padding: '9px 14px' }}>{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td style={{ padding: '9px 14px' }}>{e.eventType}</td>
                <td style={{ padding: '9px 14px' }}>{e.project ? `${e.project.code} — ${e.project.title}` : '—'}</td>
                <td style={{ padding: '9px 14px' }}>{[e.stage, e.task].filter(Boolean).join(' / ') || '—'}</td>
                <td style={{ padding: '9px 14px' }}>{(e.normalMins / 60).toFixed(2)}</td>
                <td style={{ padding: '9px 14px' }}>{(e.otMins / 60).toFixed(2)}</td>
                <td style={{ padding: '9px 14px' }}>{e.remarks || '—'}</td>
              </tr>
            ))}
            {teamMode && [...byStaff.entries()].map(([userId, staff]) => {
              const staffNormal = staff.entries.reduce((sum, e) => sum + e.normalMins, 0)
              const staffOt = staff.entries.reduce((sum, e) => sum + e.otMins, 0)
              const rowCount = Math.max(staff.entries.length, 1)
              return (
                <Fragment key={userId}>
                  {staff.entries.length === 0 ? (
                    <tr style={{ backgroundColor: '#fff' }}>
                      <td style={{ padding: '9px 14px', verticalAlign: 'top', fontWeight: 600 }}>
                        {staff.name}
                        {staff.department && <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--apex-muted)' }}>{staff.department}</div>}
                      </td>
                      <td colSpan={showActionsCol ? 8 : 7} style={{ padding: '9px 14px', color: 'var(--apex-muted)', fontStyle: 'italic' }}>No entries logged for this range.</td>
                    </tr>
                  ) : (
                    staff.entries.map((e, i) => (
                      <tr key={e.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                        {i === 0 && (
                          <td rowSpan={rowCount} style={{ padding: '9px 14px', verticalAlign: 'top', fontWeight: 600 }}>
                            {staff.name}
                            {staff.department && <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--apex-muted)' }}>{staff.department}</div>}
                          </td>
                        )}
                        <td style={{ padding: '9px 14px' }}>{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td style={{ padding: '9px 14px' }}>{e.eventType}</td>
                        <td style={{ padding: '9px 14px' }}>{e.project ? `${e.project.code} — ${e.project.title}` : '—'}</td>
                        <td style={{ padding: '9px 14px' }}>{[e.stage, e.task].filter(Boolean).join(' / ') || '—'}</td>
                        <td style={{ padding: '9px 14px' }}>{(e.normalMins / 60).toFixed(2)}</td>
                        <td style={{ padding: '9px 14px' }}>{(e.otMins / 60).toFixed(2)}</td>
                        <td style={{ padding: '9px 14px' }}>{e.remarks || '—'}</td>
                        {showActionsCol && (
                          <td style={{ padding: '9px 14px' }}>
                            <button
                              onClick={() => handleDeleteEntry(e.id)}
                              disabled={deletingId === e.id}
                              title="Delete entry"
                              style={{ background: 'none', border: 'none', cursor: deletingId === e.id ? 'not-allowed' : 'pointer', opacity: deletingId === e.id ? 0.4 : 1, padding: 0 }}
                            >
                              <Trash2 size={14} color="var(--apex-red)" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                  <tr style={{ backgroundColor: 'var(--apex-dept-bg)' }}>
                    <td colSpan={5} style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 700, fontSize: 11 }}>{staff.name} Subtotal</td>
                    <td style={{ padding: '7px 14px', fontWeight: 700, fontSize: 11 }}>{(staffNormal / 60).toFixed(2)}</td>
                    <td style={{ padding: '7px 14px', fontWeight: 700, fontSize: 11 }}>{(staffOt / 60).toFixed(2)}</td>
                    <td style={{ padding: '7px 14px' }} />
                    {showActionsCol && <td style={{ padding: '7px 14px' }} />}
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
          {results && (teamMode ? byStaff.size > 0 : results.length > 0) && (
            <tfoot>
              <tr>
                <td colSpan={teamMode ? 5 : 4} style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700 }}>
                  {teamMode ? 'Project Total (all staff)' : 'Total'}
                </td>
                <td style={{ padding: '9px 14px', fontWeight: 700 }}>{(totalNormalMins / 60).toFixed(2)}</td>
                <td style={{ padding: '9px 14px', fontWeight: 700 }}>{(totalOtMins / 60).toFixed(2)}</td>
                <td style={{ padding: '9px 14px' }} />
                {showActionsCol && <td style={{ padding: '9px 14px' }} />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}
