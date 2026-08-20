import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'

// Whoever is set as a leave group's architect (stage 1) or director (stage
// 2) can act on that group's pending applications — plus, as a fallback,
// anyone holding MANAGE_LEAVE_GROUPS can act on applications from staff
// with no group at all, who'd otherwise have no one able to approve them.
// Shared by the Leave page and the Dashboard so both always agree on the
// same count.
export type PendingApproval = { hasAuthority: boolean; count: number }

export async function getPendingApprovalCount(user: { id: string; permissions: string[] }): Promise<PendingApproval> {
  const [architectedGroups, directedGroups] = await Promise.all([
    prisma.leaveGroup.findMany({ where: { architectId: user.id }, select: { id: true } }),
    prisma.leaveGroup.findMany({ where: { directorId: user.id }, select: { id: true } }),
  ])
  const architectGroupIds = architectedGroups.map((g) => g.id)
  const directorGroupIds = directedGroups.map((g) => g.id)
  const isArchitect = architectGroupIds.length > 0
  const isDirector = directorGroupIds.length > 0
  const canApproveOrphaned = hasPermission(user, 'MANAGE_LEAVE_GROUPS')
  const hasAuthority = isArchitect || isDirector || canApproveOrphaned
  if (!hasAuthority) return { hasAuthority: false, count: 0 }

  const count = await prisma.leaveApplication.count({
    where: {
      OR: [
        ...(isArchitect ? [{ status: 'PENDING_ARCHITECT', leaveGroupId: { in: architectGroupIds } }] : []),
        ...(isDirector ? [{ status: 'PENDING_DIRECTOR', leaveGroupId: { in: directorGroupIds } }] : []),
        ...(canApproveOrphaned ? [{ status: { in: ['PENDING_ARCHITECT', 'PENDING_DIRECTOR'] }, leaveGroupId: null }] : []),
      ],
    },
  })
  return { hasAuthority: true, count }
}
