import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { PermissionCode } from '@/lib/permissions'

export async function requireUser() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  // Accounts start on a temporary password set by HR. Until the user has
  // chosen their own, every page bounces to /setup — that page reads the
  // session directly rather than going through here, so it can still render.
  if (session.user.mustCompleteSetup) redirect('/setup')
  return session.user
}

export function hasPermission(user: { permissions: string[] }, code: PermissionCode) {
  return user.permissions.includes(code)
}

export async function requirePermission(code: PermissionCode) {
  const user = await requireUser()
  if (!hasPermission(user, code)) redirect('/')
  return user
}
