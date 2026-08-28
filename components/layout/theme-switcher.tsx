'use client'

import { Monitor, Sun, Moon } from 'lucide-react'
import { useTheme, type ThemePref } from '@/lib/hooks/use-theme'

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

export function ThemeSwitcher() {
  const { pref, setTheme } = useTheme()

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = pref === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={`apex-btn${active ? ' apex-btn-primary' : ''}`}
            style={{ flex: 1 }}
          >
            <Icon size={15} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
