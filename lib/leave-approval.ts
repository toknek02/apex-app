import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'

// Whoever is set as a leave group's architect (stage 1) or director (stage 2)
// can act on that group's pending applications. MANAGE_LEAVE_GROUPS is the
// override — it can act on ANY pending application, at either stage, which is
// what lets HR step in when a group's architect or director is away (and is
// the only way applications from ungrouped staff can be decided at all).
// This must stay in step with the authority check in
// app/api/leave-applications/[id]/route.ts, which grants that same override.
export type PendingApproval = { hasAuthority: boolean; count: number }

const PENDING = ['PENDING_ARCHITECT', 'PENDING_DIRECTOR']

/**
 * The set of applications this person may act on. Shared by the Leave page and
 * the Dashboard badge so a change here can't leave the two disagreeing.
 */
export async function pendingApprovalScope(user: { id: string; permissions: string[] }) {
  const isOverride = hasPermission(user, 'MANAGE_LEAVE_GROUPS')
  // The override sees everything, so there's no need to look up group roles.
  if (isOverride) return { hasAuthority: true, where: { status: { in: PENDING } } }

  const [architectedGroups, directedGroups] = await Promise.all([
    prisma.leaveGroup.findMany({ where: { architectId: user.id }, select: { id: true } }),
    prisma.leaveGroup.findMany({ where: { directorId: user.id }, select: { id: true } }),
  ])
  const architectGroupIds = architectedGroups.map((g) => g.id)
  const directorGroupIds = directedGroups.map((g) => g.id)
  const isArchitect = architectGroupIds.length > 0
  const isDirector = directorGroupIds.length > 0
  if (!isArchitect && !isDirector) return { hasAuthority: false, where: null }

  return {
    hasAuthority: true,
    where: {
      OR: [
        ...(isArchitect ? [{ status: 'PENDING_ARCHITECT', leaveGroupId: { in: architectGroupIds } }] : []),
        ...(isDirector ? [{ status: 'PENDING_DIRECTOR', leaveGroupId: { in: directorGroupIds } }] : []),
      ],
    },
  }
}

export async function getPendingApprovalCount(user: { id: string; permissions: string[] }): Promise<PendingApproval> {
  const { hasAuthority, where } = await pendingApprovalScope(user)
  if (!where) return { hasAuthority: false, count: 0 }
  return { hasAuthority, count: await prisma.leaveApplication.count({ where }) }
}
