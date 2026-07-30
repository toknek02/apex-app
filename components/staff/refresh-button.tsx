'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function RefreshButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleRefresh() {
    setLoading(true)
    router.refresh()
    setTimeout(() => setLoading(false), 400)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
        backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 6,
        fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      <RefreshCw size={13} /> Refresh
    </button>
  )
}
