import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status } = await req.json()
  if (status !== 'resolved' && status !== 'dismissed') {
    return NextResponse.json({ error: 'Status must be resolved or dismissed' }, { status: 400 })
  }

  const existing = await prisma.passwordResetRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  const request = await prisma.passwordResetRequest.update({
    where: { id },
    data: {
      status,
      resolvedAt: new Date(),
      resolvedById: session.user.id,
      resolvedByName: session.user.name,
    },
  })
  await logAudit({
    actor: session.user,
    action: `password_reset_request.${status}`,
    targetType: 'PasswordResetRequest',
    targetId: id,
    targetLabel: existing.email,
  })
  return NextResponse.json({ request })
}
