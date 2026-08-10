'use client'

import { useEffect } from 'react'

function report(message: string, stack?: string | null) {
  fetch('/api/client-error-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, stack, url: window.location.href }),
  }).catch(() => {})
}

export function ErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      report(event.message, event.error?.stack)
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      report(reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
