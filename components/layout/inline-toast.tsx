'use client'

export function InlineToast({ text, error }: { text: string; error?: boolean }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 500,
        padding: '10px 20px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        color: '#fff',
        backgroundColor: error ? 'var(--apex-red)' : 'var(--apex-green)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {text}
    </div>
  )
}
