'use client'

import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'apex-theme'

// Mirrors the pre-paint script in app/layout.tsx: 'system' clears the attribute
// and lets prefers-color-scheme decide; 'light'/'dark' pin it.
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>('system')

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v === 'dark' || v === 'light') setPref(v)
    } catch {}
  }, [])

  const setTheme = useCallback((p: ThemePref) => {
    setPref(p)
    try {
      if (p === 'system') {
        localStorage.removeItem(KEY)
        document.documentElement.removeAttribute('data-theme')
      } else {
        localStorage.setItem(KEY, p)
        document.documentElement.setAttribute('data-theme', p)
      }
    } catch {}
  }, [])

  return { pref, setTheme }
}
