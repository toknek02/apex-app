'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/password-reset-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setLoading(false)
    setSubmitted(true)
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
          backgroundColor: '#fff',
          border: '1px solid var(--apex-border)',
          borderRadius: 10,
          padding: 28,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              fontFamily: 'Sora, sans-serif',
              fontWeight: 700,
              fontSize: 26,
              color: 'var(--apex-accent)',
              letterSpacing: '-0.5px',
            }}
          >
            APEX
          </span>
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--apex-muted)' }}>Forgot your password?</p>
        </div>

        {submitted ? (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <p>If that email is on file, an administrator has been notified and will reset your password directly.</p>
            <p style={{ marginTop: 12 }}>
              <Link href="/login" style={{ color: 'var(--apex-accent)', fontWeight: 600, textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--apex-muted)' }}>
              Enter your account email. An administrator will be notified and will reset your password for you.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                inputMode="email"
                placeholder="you@apex.local"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--apex-border)',
                  borderRadius: 6,
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
            </div>
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
              {loading ? 'Submitting…' : 'Notify an Admin'}
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
