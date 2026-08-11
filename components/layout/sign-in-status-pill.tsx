'use client'

import { useSignInStatus } from '@/lib/hooks/use-sign-in-status'

export function SignInStatusPill({ isMobile }: { isMobile: boolean }) {
  const status = useSignInStatus()
  const signedIn = status?.signedIn ?? false

  return (
    <div
      title={
        status === null
          ? 'Checking attendance status…'
          : signedIn
            ? `Signed in since ${new Date(status.signInAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`
            : 'Not signed in'
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: isMobile ? '4px 8px' : '4px 12px',
        borderRadius: 20,
        backgroundColor: signedIn ? 'rgba(58,166,90,0.18)' : 'rgba(255,255,255,0.1)',
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
    </div>
  )
}
