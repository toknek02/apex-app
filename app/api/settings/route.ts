import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

async function getOrCreateSettings() {
  return prisma.orgSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  })
}

export async function GET() {
  await requirePermission('MANAGE_SETTINGS')
  const settings = await getOrCreateSettings()
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const user = await requirePermission('MANAGE_SETTINGS')
  const body = await req.json()

  const officeLat = body.officeLat === '' || body.officeLat === null ? null : Number(body.officeLat)
  const officeLng = body.officeLng === '' || body.officeLng === null ? null : Number(body.officeLng)
  const officeRadiusM = Math.max(1, Math.round(Number(body.officeRadiusM) || 200))

  if (officeLat !== null && (Number.isNaN(officeLat) || officeLat < -90 || officeLat > 90)) {
    return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 })
  }
  if (officeLng !== null && (Number.isNaN(officeLng) || officeLng < -180 || officeLng > 180)) {
    return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 })
  }

  await getOrCreateSettings()
  const settings = await prisma.orgSettings.update({
    where: { id: 'singleton' },
    data: { officeLat, officeLng, officeRadiusM },
  })
  await logAudit({
    actor: user,
    action: 'settings.update',
    targetType: 'OrgSettings',
    targetId: 'singleton',
    metadata: { officeLat, officeLng, officeRadiusM },
  })
  return NextResponse.json(settings)
}
