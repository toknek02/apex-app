'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this announcement? This cannot be undone.')) return
    setLoading(true)
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to delete announcement')
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete announcement"
      style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', padding: 0 }}
    >
      <Trash2 size={14} color="var(--apex-red)" />
    </button>
  )
}
