'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SignInButton({ signedIn, signInAt }: { signedIn: boolean; signInAt: string | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    await fetch('/api/sign-in', { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        border: '1px solid var(--apex-border)',
        borderRadius: 10,
        padding: '12px 18px',
        marginBottom: 16,
      }}
    >
      <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: signedIn ? 'var(--apex-green)' : 'var(--apex-muted)' }} />
      <span style={{ fontSize: 13 }}>
        {signedIn ? `Signed in since ${signInAt}` : 'You are not signed in'}
      </span>
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          marginLeft: 'auto',
          padding: '7px 16px',
          borderRadius: 6,
          border: 'none',
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          backgroundColor: signedIn ? 'var(--apex-red)' : 'var(--apex-green)',
          color: '#fff',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Please wait…' : signedIn ? 'Sign Out' : 'Sign In'}
      </button>
    </div>
  )
}
