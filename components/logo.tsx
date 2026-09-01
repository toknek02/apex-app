// Arkitek MAA mark — a bold "M" drawn as a twin roofline, set in an accent tile.
// Inline SVG so it needs no asset pipeline and recolors via --apex-accent in
// both themes. app/icon.svg carries the same mark as the favicon.
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Arkitek MAA"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect width="32" height="32" rx="7" fill="var(--apex-accent)" />
      {/* --apex-accent is light sky-blue in dark mode; white would vanish.
          --apex-btn-primary-fg is the system's "text on accent" token
          (white in light, near-black in dark) — same fix as primary buttons. */}
      <path
        d="M7 22.5V11l9 7 9-7v11.5"
        stroke="var(--apex-btn-primary-fg)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
