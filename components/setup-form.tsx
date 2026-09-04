'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

export function SetupForm({ name, existingEmail }: { name: string; existingEmail: string }) {
  const [email, setEmail] = useState(existingEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [noEmail, setNoEmail] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm) return setError('The two passwords do not match')
    if (!noEmail && !email.trim()) {
      return setError("Enter your email, or tick “I don't have a work email”")
    }

    setSaving(true)
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, email: noEmail ? '' : email.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      // Full reload rather than router.push: the session token still says
      // setup is pending until it's re-issued, so a client-side navigation
      // would bounce straight back here.
      window.location.assign('/')
      return
    }
    const data = await res.json().catch(() => ({}))
    setError(data.error ?? 'Could not save your details')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--apex-bg)',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div className="apex-card" style={{ width: '100%', maxWidth: 440, padding: 28, boxShadow: 'var(--apex-shadow-pop)' }}>
        <h1 style={{ fontFamily: 'var(--apex-font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Welcome{name ? `, ${name.split(' ')[0]}` : ''}
        </h1>
        <p style={{ margin: '6px 0 22px', fontSize: 13, color: 'var(--apex-muted)' }}>
          You&apos;re signed in with a temporary password. Choose your own password to finish setting up your account.
        </p>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 'var(--apex-radius-sm)',
              backgroundColor: 'var(--apex-red-lt)',
              color: 'var(--apex-red)',
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="apex-label">Email</label>
            <input
              className="apex-input"
              type="email"
              value={email}
              disabled={noEmail}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@arkitekmaa.com"
              style={{ fontSize: 16, opacity: noEmail ? 0.5 : 1 }}
            />
            <div className="apex-hint">
              Used to reset your own password later, without waiting on HR.
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={noEmail} onChange={(e) => setNoEmail(e.target.checked)} />
              I don&apos;t have a work email
            </label>
          </div>

          <div>
            <label className="apex-label">New Password</label>
            <input
              className="apex-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 6 characters"
              style={{ fontSize: 16 }}
            />
          </div>

          <div>
            <label className="apex-label">Confirm New Password</label>
            <input
              className="apex-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Type it again"
              style={{ fontSize: 16 }}
            />
          </div>

          <button type="submit" disabled={saving} className="apex-btn apex-btn-primary" style={{ marginTop: 4, width: '100%', minHeight: 44 }}>
            {saving ? 'Saving…' : 'Finish Setup'}
          </button>
        </form>

        <p style={{ marginTop: 14, fontSize: 12, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="apex-btn apex-btn-ghost apex-btn-sm"
            style={{ color: 'var(--apex-muted)' }}
          >
            Sign out instead
          </button>
        </p>
      </div>
    </div>
  )
}
