'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete ${userName}? This cannot be undone.`)) return
    setLoading(true)
    const res = await fetch(`/api/staff/${userId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to delete user')
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete user"
      style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.4 : 1, padding: 0 }}
    >
      <Trash2 size={14} color="var(--apex-red)" />
    </button>
  )
}
