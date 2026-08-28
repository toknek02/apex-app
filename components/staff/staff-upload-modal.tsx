'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

type UploadResult = {
  created: { name: string; username: string }[]
  skipped: { name: string; reason: string }[]
}

export function StaffUploadModal({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [uploading, setUploading] = useState(false)

  function close() {
    setOpen(false)
    setFile(null)
    setPassword('')
    setError('')
    setResult(null)
  }

  async function handleUpload() {
    setError('')
    if (!file) {
      setError('Choose a file first')
      return
    }
    if (password.length < 6) {
      setError('Temporary password must be at least 6 characters')
      return
    }
    setUploading(true)
    const body = new FormData()
    body.append('file', file)
    body.append('password', password)
    const res = await fetch('/api/staff/upload', { method: 'POST', body })
    setUploading(false)
    if (res.ok) {
      const data = await res.json()
      setResult(data)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Upload failed')
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'inline-flex' }}>
        {trigger}
      </span>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--apex-surface)', borderRadius: 10, width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ padding: '24px 24px 0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Upload Staff</h2>
              <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16 }}>
                An .xlsx or .csv file with a header row containing "Name" and "Designation" columns. Every sheet is scanned —
                rows already matching an existing staff member (by name) are skipped. Everything besides Name and Designation
                is left for you to fill in afterward via Staff Directory.
              </p>
              {error && (
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ padding: '0 24px 16px', overflowY: 'auto', flex: 1 }}>
              {!result ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>File</label>
                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      style={inputStyle}
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Temporary Password (for every new account)</label>
                    <input
                      type="password"
                      style={inputStyle}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                    <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 5 }}>
                      Everyone uploaded shares this password — have them reset it after their first login.
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--apex-green)' }}>
                    Created {result.created.length} staff member(s)
                  </div>
                  {result.created.length > 0 && (
                    <div style={{ border: '1px solid var(--apex-border)', borderRadius: 6, maxHeight: 160, overflowY: 'auto', marginBottom: 12 }}>
                      {result.created.map((c) => (
                        <div key={c.username} style={{ padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--apex-border)' }}>
                          {c.name} <span style={{ color: 'var(--apex-muted)' }}>— {c.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.skipped.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--apex-muted)' }}>
                        Skipped {result.skipped.length}
                      </div>
                      <div style={{ border: '1px solid var(--apex-border)', borderRadius: 6, maxHeight: 160, overflowY: 'auto' }}>
                        {result.skipped.map((s, i) => (
                          <div key={i} style={{ padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--apex-border)' }}>
                            {s.name} <span style={{ color: 'var(--apex-muted)' }}>— {s.reason}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--apex-border)' }}>
              <button onClick={close} style={{ padding: '8px 16px', border: '1px solid var(--apex-border)', backgroundColor: 'var(--apex-surface)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                {result ? 'Close' : 'Cancel'}
              </button>
              {!result && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{ padding: '8px 16px', border: 'none', backgroundColor: 'var(--apex-navy)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
