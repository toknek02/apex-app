'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        <div style={{ marginBottom: 28 }}>
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
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--apex-muted)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Name or Email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              placeholder="e.g. azmi"
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
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
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

          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--apex-red-lt)',
                color: 'var(--apex-red)',
                fontSize: 12,
              }}
            >
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
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 14, fontSize: 12, textAlign: 'center' }}>
          <Link href="/forgot-password" style={{ color: 'var(--apex-accent)', textDecoration: 'none', fontWeight: 600 }}>
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  )
}
