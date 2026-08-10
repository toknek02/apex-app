'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PasswordResetActions({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function setStatus(status: 'resolved' | 'dismissed') {
    setLoading(true)
    const res = await fetch(`/api/password-reset-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to update request')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button
        onClick={() => setStatus('resolved')}
        disabled={loading}
        style={{ padding: '5px 12px', borderRadius: 6, border: 'none', backgroundColor: 'var(--apex-green)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
      >
        Mark Resolved
      </button>
      <button
        onClick={() => setStatus('dismissed')}
        disabled={loading}
        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--apex-border)', backgroundColor: '#fff', color: 'var(--apex-muted)', fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
      >
        Dismiss
      </button>
    </div>
  )
}
