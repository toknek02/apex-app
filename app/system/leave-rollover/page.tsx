import { requirePermission } from '@/lib/rbac'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { getRolloverHistory } from '@/lib/leave-rollover'
import { RolloverForm } from './rollover-form'

export default async function LeaveRolloverPage() {
  const user = await requirePermission('MANAGE_LEAVE_ENTITLEMENTS')
  const history = await getRolloverHistory()
  const defaultYear = new Date().getFullYear() - 1

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Leave Rollover']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Leave Rollover</h1>
      <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16, maxWidth: 640 }}>
        Carries each active staff member&apos;s unused Annual Leave from a closing year into their brought-forward
        balance for the next year. Preview first — nothing changes until you apply. Entitlement is not touched; set
        the new year&apos;s entitlement separately in Staff. Medical Leave does not roll over.
      </p>

      <RolloverForm
        defaultYear={defaultYear}
        history={history.map((h) => ({
          fromYear: h.fromYear,
          capDays: h.capDays,
          affectedCount: h.affectedCount,
          appliedByName: h.appliedByName,
          appliedAt: h.appliedAt.toISOString(),
        }))}
      />
    </AppShell>
  )
}
