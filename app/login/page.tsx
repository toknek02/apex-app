'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

const LOGOUT_REASON_MESSAGES: Record<string, string> = {
  cutoff: 'You were automatically signed out at 6:30pm. Please sign in again.',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dismissedNotice, setDismissedNotice] = useState(false)

  const reason = searchParams.get('reason')
  const notice = !dismissedNotice && reason ? LOGOUT_REASON_MESSAGES[reason] : undefined

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', { identifier, password, redirect: false })

    setLoading(false)

    if (!result?.error) {
      window.location.assign('/')
      return
    }

    setError('Invalid name/email or password.')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--apex-bg)',
        padding: '16px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="apex-card"
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 28,
          boxShadow: 'var(--apex-shadow-pop)',
        }}
      >
        <div style={{ marginBottom: 26, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--apex-accent)' }} />
          <div>
            <span
              style={{
                fontFamily: 'var(--apex-font-display)',
                fontWeight: 700,
                fontSize: 24,
                color: 'var(--apex-text)',
                letterSpacing: '-0.02em',
              }}
            >
              APEX
            </span>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--apex-muted)' }}>Sign in to your account</p>
          </div>
        </div>

        {notice && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--apex-radius-sm)',
              backgroundColor: 'var(--apex-accent-lt)',
              color: 'var(--apex-accent-hover)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setDismissedNotice(true)}
              aria-label="Dismiss"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="apex-label">Name or Email</label>
            <input
              className="apex-input"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              placeholder="e.g. azmi"
              style={{ fontSize: 16 }}
            />
          </div>
          <div>
            <label className="apex-label">Password</label>
            <input
              className="apex-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ fontSize: 16 }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--apex-radius-sm)',
                backgroundColor: 'var(--apex-red-lt)',
                color: 'var(--apex-red)',
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="apex-btn apex-btn-primary" style={{ marginTop: 4, width: '100%', minHeight: 44 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 14, fontSize: 12, textAlign: 'center' }}>
          <Link href="/forgot-password" style={{ fontWeight: 600 }}>
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  )
}
