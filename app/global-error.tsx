'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch('/api/client-error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, stack: error.stack, url: window.location.href }),
    }).catch(() => {})
  }, [error])

  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: '#666' }}>The error has been logged.</p>
          <button
            onClick={() => reset()}
            style={{ padding: '8px 20px', borderRadius: 6, border: 'none', backgroundColor: '#1c2b4a', color: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
