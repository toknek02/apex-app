import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function logAudit(entry: {
  actor: { id: string; name?: string | null }
  action: string
  targetType: string
  targetId?: string
  targetLabel?: string
  metadata?: Record<string, unknown>
}) {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actor.id,
      actorName: entry.actor.name ?? 'Unknown',
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      targetLabel: entry.targetLabel,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined,
    },
  })
}
