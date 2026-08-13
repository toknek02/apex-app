'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LeaveApprovalActions({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [error, setError] = useState('')

  async function decide(status: 'APPROVED' | 'REJECTED') {
    let reviewRemarks = ''
    if (status === 'REJECTED') {
      const input = window.prompt('Reason for rejection (optional, shown to the employee):')
      if (input === null) return // cancelled
      reviewRemarks = input
    }
    setError('')
    setSubmitting(status)
    const res = await fetch(`/api/leave-applications/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewRemarks }),
    })
    setSubmitting(null)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to record decision')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => decide('APPROVED')}
          disabled={submitting !== null}
          style={{ padding: '5px 12px', border: 'none', borderRadius: 6, backgroundColor: 'var(--apex-green)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting === 'APPROVED' ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={() => decide('REJECTED')}
          disabled={submitting !== null}
          style={{ padding: '5px 12px', border: 'none', borderRadius: 6, backgroundColor: 'var(--apex-red)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting === 'REJECTED' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
      {error && <span style={{ fontSize: 11, color: 'var(--apex-red)' }}>{error}</span>}
    </div>
  )
}
