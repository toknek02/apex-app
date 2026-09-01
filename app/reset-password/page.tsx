'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}

function ResetForm() {
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).catch(() => null)
    setLoading(false)
    if (res?.ok) {
      setDone(true)
      return
    }
    const data = await res?.json().catch(() => ({}))
    setError(data?.error ?? 'Something went wrong. Try again.')
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
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: 'var(--apex-surface)',
          border: '1px solid var(--apex-border)',
          borderRadius: 10,
          padding: 28,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <span
            style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--apex-text)', letterSpacing: '-0.5px' }}
          >
            MAA-OA
          </span>
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--apex-muted)' }}>Set a new password</p>
        </div>

        {done ? (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <p>Your password has been updated. You&apos;ve been signed out everywhere else.</p>
            <p style={{ marginTop: 12 }}>
              <Link href="/login" style={{ color: 'var(--apex-accent)', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
            </p>
          </div>
        ) : !token ? (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <p>This link is missing its reset token. Open the link from your email again, or request a new one.</p>
            <p style={{ marginTop: 12 }}>
              <Link href="/forgot-password" style={{ color: 'var(--apex-accent)', fontWeight: 600, textDecoration: 'none' }}>
                Request a reset link
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                autoComplete="new-password"
                placeholder="At least 6 characters"
                style={{ width: '100%', padding: '12px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                style={{ width: '100%', padding: '12px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 16, boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '13px 0',
                backgroundColor: 'var(--apex-navy)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
            <p style={{ fontSize: 12, textAlign: 'center' }}>
              <Link href="/login" style={{ color: 'var(--apex-accent)', textDecoration: 'none', fontWeight: 600 }}>
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
