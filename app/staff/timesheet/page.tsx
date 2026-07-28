import Link from 'next/link'
import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const now = new Date()
  const [yearStr, monthStr] = (sp.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) - 1 // 0-indexed

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const daysInMonth = monthEnd.getDate()
  const monthLabel = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const prevMonth = new Date(year, month - 1, 1)
  const nextMonth = new Date(year, month + 1, 1)
  const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  const nextKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

  const [staff, records] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.signInRecord.findMany({ where: { signInAt: { gte: monthStart, lte: monthEnd } } }),
  ])

  const signedDays = new Map<string, Set<number>>() // userId -> set of day numbers
  for (const r of records) {
    if (!signedDays.has(r.userId)) signedDays.set(r.userId, new Set())
    signedDays.get(r.userId)!.add(r.signInAt.getDate())
  }

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <AppShell user={{ name: user.name ?? '', role: user.role }}>
      <Breadcrumb items={['Staff', 'Timesheet']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Timesheet — {monthLabel}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href={`/staff/timesheet?month=${prevKey}`} style={navBtn}>&lt; Prev Month</Link>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{monthLabel}</span>
        <Link href={`/staff/timesheet?month=${nextKey}`} style={navBtn}>Next Month &gt;</Link>
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              <th style={{ ...thStyle, position: 'sticky', left: 0, backgroundColor: 'var(--apex-tbl-hdr)', minWidth: 160, textAlign: 'left' }}>Staff</th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isToday = isCurrentMonth && today.getDate() === day
                return (
                  <th key={day} style={{ ...thStyle, backgroundColor: isToday ? 'var(--apex-accent)' : 'var(--apex-tbl-hdr)', minWidth: 26 }}>
                    {day}
                  </th>
                )
              })}
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s, i) => {
              const days = signedDays.get(s.id) ?? new Set<number>()
              return (
                <tr key={s.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                  <td style={{ ...tdStyle, position: 'sticky', left: 0, backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff', textAlign: 'left', fontWeight: 600 }}>
                    {s.name}
                  </td>
                  {Array.from({ length: daysInMonth }, (_, di) => di + 1).map((day) => {
                    const isToday = isCurrentMonth && today.getDate() === day
                    return (
                      <td key={day} style={{ ...tdStyle, backgroundColor: isToday ? 'var(--apex-accent-lt)' : undefined }}>
                        {days.has(day) ? <span style={{ color: 'var(--apex-green)', fontWeight: 700 }}>✓</span> : <span style={{ color: 'var(--apex-border)' }}>—</span>}
                      </td>
                    )
                  })}
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{days.size}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--apex-muted)' }}>
        <span style={{ color: 'var(--apex-green)', fontWeight: 700 }}>✓</span> Signed In &nbsp;·&nbsp; — No Record
      </div>
    </AppShell>
  )
}

const navBtn: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid var(--apex-border)',
  borderRadius: 6,
  fontSize: 12,
  textDecoration: 'none',
  color: 'var(--apex-text)',
  backgroundColor: '#fff',
}

const thStyle: React.CSSProperties = {
  padding: '6px 4px',
  color: '#fff',
  fontSize: 10,
  fontWeight: 600,
  textAlign: 'center',
}

const tdStyle: React.CSSProperties = {
  padding: '6px 4px',
  fontSize: 11,
  textAlign: 'center',
  borderBottom: '1px solid var(--apex-border)',
}
