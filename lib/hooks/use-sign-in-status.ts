'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Status = { signedIn: boolean; signInAt: string | null }
type Toast = { text: string; error?: boolean }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function useSignInStatus() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/sign-in')
    if (res.ok) setStatus(await res.json())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function showToast(next: Toast) {
    setToast(next)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  async function toggle() {
    setLoading(true)
    const res = await fetch('/api/sign-in', { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      const signedIn = data.status === 'signed-in'
      const timeStr = formatTime(signedIn ? data.record.signInAt : data.record.signOutAt)
      setStatus({ signedIn, signInAt: signedIn ? data.record.signInAt : null })
      showToast({ text: signedIn ? `Signed in at ${timeStr}` : `Signed out at ${timeStr}` })
    } else {
      showToast({ text: 'Failed to update sign-in status. Please try again.', error: true })
    }
  }

  return { status, loading, toast, toggle }
}
