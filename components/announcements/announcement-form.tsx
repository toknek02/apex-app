'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RecipientPicker } from '@/components/announcements/recipient-picker'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 13,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }

type Announcement = { id: string; title: string; body: string; recipientIds: string[] }
type StaffOption = { id: string; name: string; department: string | null }

export function AnnouncementForm({ announcement, staff }: { announcement?: Announcement; staff: StaffOption[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(announcement?.title ?? '')
  const [body, setBody] = useState(announcement?.body ?? '')
  const [files, setFiles] = useState<FileList | null>(null)
  const [recipientIds, setRecipientIds] = useState<Set<string>>(new Set(announcement?.recipientIds ?? []))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required')
      return
    }

    setSubmitting(true)
    let res: Response
    if (announcement) {
      res = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, recipientIds: [...recipientIds] }),
      })
    } else {
      const formData = new FormData()
      formData.set('title', title)
      formData.set('body', body)
      formData.set('recipientIds', JSON.stringify([...recipientIds]))
      if (files) {
        for (const file of Array.from(files)) formData.append('files', file)
      }
      res = await fetch('/api/announcements', { method: 'POST', body: formData })
    }
    setSubmitting(false)

    if (res.ok) {
      router.push('/announcements')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? `Failed to ${announcement ? 'update' : 'post'} announcement`)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 640 }}
    >
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Title</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...inputStyle, minHeight: 140 }} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>

      <RecipientPicker staff={staff} selected={recipientIds} onChange={setRecipientIds} />

      {!announcement && (
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Attachments (optional)</label>
          <input type="file" multiple onChange={(e) => setFiles(e.target.files)} style={{ fontSize: 12 }} />
        </div>
      )}

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
        {submitting ? (announcement ? 'Saving…' : 'Posting…') : announcement ? 'Save Changes' : 'Post Announcement'}
      </button>
    </form>
  )
}
