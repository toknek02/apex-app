import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { SettingsForm } from '@/components/system/settings-form'

export default async function SettingsPage() {
  const user = await requirePermission('MANAGE_SETTINGS')
  const settings = await prisma.orgSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Settings']} />
      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Settings</h1>

      <SettingsForm settings={settings} />
    </AppShell>
  )
}
