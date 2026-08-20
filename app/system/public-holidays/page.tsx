import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { PublicHolidayForm } from '@/components/system/public-holiday-form'

export default async function PublicHolidaysPage() {
  const user = await requirePermission('MANAGE_PUBLIC_HOLIDAYS')

  const publicHolidays = await prisma.publicHoliday.findMany({ orderBy: { startDate: 'asc' } })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Public Holidays']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Public Holidays</h1>
      <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 20, textAlign: 'center' }}>
        Dates marked here are cross-referenced against timesheet entries to apply the public-holiday overtime rate.
      </p>
      <PublicHolidayForm
        publicHolidays={publicHolidays.map((h) => ({ id: h.id, startDate: h.startDate.toISOString(), endDate: h.endDate.toISOString(), name: h.name, recurring: h.recurring }))}
      />
    </AppShell>
  )
}
