import { it, expect, vi } from 'vitest'
// rbac.ts pulls in next-auth, which won't load outside Next. hasPermission is
// a pure `includes` check, so stubbing it exercises the real scope logic.
vi.mock('@/lib/rbac', () => ({
  hasPermission: (u: { permissions: string[] }, code: string) => u.permissions.includes(code),
}))
const { pendingApprovalScope } = await import('@/lib/leave-approval')

// Regression guard: the override used to be narrowed to ungrouped applications
// only, so HR could approve anything via the API but the UI listed almost
// nothing — leaving a group stuck whenever its architect/director was away.
it('the MANAGE_LEAVE_GROUPS override covers every pending application', async () => {
  const scope = await pendingApprovalScope({ id: 'anyone', permissions: ['MANAGE_LEAVE_GROUPS'] })
  expect(scope.hasAuthority).toBe(true)
  expect(scope.where).toEqual({ status: { in: ['PENDING_ARCHITECT', 'PENDING_DIRECTOR'] } })
  // Crucially, not scoped to leaveGroupId: null.
  expect(JSON.stringify(scope.where)).not.toContain('leaveGroupId')
})
