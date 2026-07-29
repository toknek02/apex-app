'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteRoleButton({ roleId, disabled }: { roleId: string; disabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this role? This cannot be undone.')) return
    setLoading(true)
    const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to delete role')
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={disabled || loading}
      title={disabled ? 'Protected role, or still assigned to users' : 'Delete role'}
      style={{ background: 'none', border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1, padding: 0 }}
    >
      <Trash2 size={14} color="var(--apex-red)" />
    </button>
  )
}
