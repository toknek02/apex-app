'use client'

import { useRouter } from 'next/navigation'
import { useSignInStatus } from '@/lib/hooks/use-sign-in-status'
import { InlineToast } from '@/components/layout/inline-toast'

export function SignInStatusPill({ isMobile }: { isMobile: boolean }) {
  const router = useRouter()
  const { status, loading, toast, toggle } = useSignInStatus()
  const signedIn = status?.signedIn ?? false

  async function handleClick() {
    await toggle()
    router.refresh()
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || status === null}
        title={
          status === null
            ? 'Checking sign-in status…'
            : signedIn
              ? `Signed in since ${new Date(status.signInAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} — click to sign out`
              : 'Click to sign in'
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: isMobile ? '4px 8px' : '4px 12px',
          borderRadius: 20,
          border: 'none',
          backgroundColor: signedIn ? 'rgba(58,166,90,0.18)' : 'rgba(255,255,255,0.1)',
          cursor: loading || status === null ? 'not-allowed' : 'pointer',
          opacity: loading || status === null ? 0.6 : 1,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: signedIn ? 'var(--apex-green)' : 'rgba(255,255,255,0.4)',
          }}
        />
        {!isMobile && (
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {status === null ? 'Checking…' : signedIn ? 'Signed In' : 'Signed Out'}
          </span>
        )}
      </button>
      {toast && <InlineToast text={toast.text} error={toast.error} />}
    </>
  )
}
