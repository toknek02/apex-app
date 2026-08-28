'use client'

import { useState } from 'react'
import { NOTIFICATION_TYPES } from '@/lib/notification-types'

export function NotificationPreferences({ initialMuted }: { initialMuted: string[] }) {
  const [muted, setMuted] = useState(new Set(initialMuted))
  const [open, setOpen] = useState(false)
  const [savingType, setSavingType] = useState<string | null>(null)

  async function toggle(type: string) {
    const nextMuted = !muted.has(type)
    setSavingType(type)
    setMuted((prev) => {
      const next = new Set(prev)
      if (nextMuted) next.add(type)
      else next.delete(type)
      return next
    })
    await fetch('/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, muted: nextMuted }),
    })
    setSavingType(null)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--apex-accent)', fontWeight: 600, padding: 0 }}
      >
        {open ? 'Hide preferences' : 'Notification preferences'}
      </button>

      {open && (
        <div style={{ marginTop: 10, backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 12 }}>
            Turn off types you don&apos;t want to be notified about. Muted notifications are never created for you — they won&apos;t appear here or in the bell.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {NOTIFICATION_TYPES.map((t) => (
              <label key={t.type} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!muted.has(t.type)}
                  disabled={savingType === t.type}
                  onChange={() => toggle(t.type)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--apex-muted)' }}>{t.description}</div>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
