'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteEventButton({ eventId, redirectTo }: { eventId: string; redirectTo?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this event? This cannot be undone.')) return
    setLoading(true)
    const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to delete event')
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete event"
      style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.4 : 1, padding: 0 }}
    >
      <Trash2 size={14} color="var(--apex-red)" />
    </button>
  )
}
