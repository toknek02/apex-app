'use client'

import { useCallback, useEffect, useState } from 'react'

type Status = { signedIn: boolean; signInAt: string | null }

// Attendance is tied to login/logout now, not a manual toggle — this just
// reflects current status, refetching whenever the tab regains focus so it
// stays accurate if the session ends elsewhere.
export function useSignInStatus() {
  const [status, setStatus] = useState<Status | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/sign-in')
    if (res.ok) setStatus(await res.json())
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  return status
}
