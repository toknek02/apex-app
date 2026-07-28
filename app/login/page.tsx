'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', { email, password, redirect: false })

    setLoading(false)

    if (!result?.error) {
      window.location.assign('/')
      return
    }

    setError('Invalid email or password.')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--apex-bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: '#fff',
          border: '1px solid var(--apex-border)',
          borderRadius: 10,
          padding: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@apex.local"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--apex-border)',
                borderRadius: 6,
                fontSize: 13,
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
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--apex-border)',
                borderRadius: 6,
                fontSize: 13,
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
              padding: '10px 0',
              backgroundColor: 'var(--apex-navy)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: 11, color: 'var(--apex-muted)' }}>
          Admin: admin@apex.local / admin123 &middot; Staff: any seeded staff email / staff123
        </p>
      </div>
    </div>
  )
}
