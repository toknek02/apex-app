import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import type { PermissionCode } from '@/lib/permissions'

export async function requireUser() {
  const session = await auth()
  if (!session?.user) redirect('/login')
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
