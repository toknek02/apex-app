'use client'

import { useRouter } from 'next/navigation'
import { useSignInStatus } from '@/lib/hooks/use-sign-in-status'
import { InlineToast } from '@/components/layout/inline-toast'

export function SignInButton() {
  const router = useRouter()
  const { status, loading, toast, toggle } = useSignInStatus()

  async function handleClick() {
    await toggle()
    router.refresh()
  }

  const signedIn = status?.signedIn ?? false
  const signInAt = status?.signInAt
    ? new Date(status.signInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null

  return (
    <>
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
          {status === null ? 'Checking status…' : signedIn ? `Signed in since ${signInAt}` : 'You are not signed in'}
        </span>
        <button
          onClick={handleClick}
          disabled={loading || status === null}
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
            opacity: loading || status === null ? 0.6 : 1,
          }}
        >
          {loading ? 'Please wait…' : signedIn ? 'Sign Out' : 'Sign In'}
        </button>
      </div>
      {toast && <InlineToast text={toast.text} error={toast.error} />}
    </>
  )
}
