import Link from 'next/link'
import { requireUser } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import { getBothLeaveBalances, type LeaveBalance } from '@/lib/leave-balance'

const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--apex-border)', fontSize: 13 }
const labelStyle: React.CSSProperties = { color: 'var(--apex-muted)' }

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export default async function ProfilePage() {
  const sessionUser = await requireUser()
  const [user, { annual: annualBalance, medical: medicalBalance }] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { name: true, username: true, email: true, department: true, designation: true, role: { select: { name: true } } },
    }),
    getBothLeaveBalances(sessionUser.id),
  ])

  return (
    <AppShell user={{ name: sessionUser.name ?? '', roleName: sessionUser.roleName, permissions: sessionUser.permissions }}>
      <Breadcrumb items={['My Profile']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>My Profile</h1>

      <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 480, margin: '0 auto 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Account Info</h2>
        <InfoRow label="Full Name" value={user?.name ?? '—'} />
        <InfoRow label="Name (login)" value={user?.username ?? '— Not set —'} />
        <InfoRow label="Email" value={user?.email ?? '— Not set —'} />
        <InfoRow label="Department" value={user?.department ?? '— Not set —'} />
        <InfoRow label="Designation" value={user?.designation ?? '— Not set —'} />
        <InfoRow label="Role" value={user?.role.name ?? '—'} />
        <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 10 }}>
          Something wrong here? Ask HR/Admin to update it via Staff Directory.
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 480, margin: '0 auto 20px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Appearance</h2>
        <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 12 }}>Theme for this browser. &quot;System&quot; follows your OS setting.</p>
        <ThemeSwitcher />
      </div>

      <LeaveBalanceCard title="Annual Leave" balance={annualBalance} unsetMessage="HR hasn't set an Annual Leave entitlement for you yet — applications aren't restricted in the meantime." exhaustedMessage="You're out of Annual Leave for this year — new applications must be Unpaid Annual Leave instead." />
      <LeaveBalanceCard title="Medical Leave (MC)" balance={medicalBalance} unsetMessage="HR hasn't set a Medical Leave entitlement for you yet." exhaustedMessage="You've used your full Medical Leave (MC) entitlement for this year — any further MC is over the tracked allowance." last />
    </AppShell>
  )
}

function LeaveBalanceCard({
  title,
  balance,
  unsetMessage,
  exhaustedMessage,
  last,
}: {
  title: string
  balance: LeaveBalance
  unsetMessage: string
  exhaustedMessage: string
  last?: boolean
}) {
  const isExhausted = balance.remaining !== null && balance.remaining <= 0
  return (
    <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, maxWidth: 480, margin: last ? '0 auto' : '0 auto 20px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{title} — {balance.year}</h2>
      {balance.totalAvailable === null ? (
        <p style={{ fontSize: 12, color: 'var(--apex-muted)', fontStyle: 'italic' }}>{unsetMessage}</p>
      ) : (
        <>
          <InfoRow label="Entitlement this year" value={balance.entitlement === null ? '0 (not set)' : `${balance.entitlement} day(s)`} />
          <InfoRow label="Brought forward" value={`${balance.broughtForward} day(s)`} />
          <InfoRow label="Total available" value={`${balance.totalAvailable} day(s)`} />
          <InfoRow label="Used / pending" value={`${balance.usedDays} day(s)`} />
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Remaining</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: isExhausted ? 'var(--apex-red)' : 'var(--apex-green)' }}>
              {balance.remaining} day(s)
            </span>
          </div>
          {isExhausted && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--apex-red-lt)', color: 'var(--apex-red)', fontSize: 12 }}>
              {exhaustedMessage}
            </div>
          )}
        </>
      )}
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Link href="/staff/leave/new" style={{ fontSize: 12, fontWeight: 600, color: 'var(--apex-accent)', textDecoration: 'none' }}>
          Apply for Leave →
        </Link>
      </div>
    </div>
  )
}
