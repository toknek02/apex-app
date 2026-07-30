export type PermissionCode =
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES'
  | 'MANAGE_VENUES'
  | 'MANAGE_PROJECTS'
  | 'EDIT_ANY_EVENT'
  | 'MANAGE_ANNOUNCEMENTS'

export type PermissionMeta = {
  code: PermissionCode
  label: string
  description: string
}

export const PERMISSIONS: PermissionMeta[] = [
  { code: 'MANAGE_USERS', label: 'Manage users', description: 'Create, edit, deactivate/reactivate users, and reset passwords.' },
  { code: 'MANAGE_ROLES', label: 'Manage roles', description: 'Create roles and configure which permissions each role grants.' },
  { code: 'MANAGE_VENUES', label: 'Manage venues', description: 'Create and edit venues used in the LogBook.' },
  { code: 'MANAGE_PROJECTS', label: 'Manage projects', description: 'Create and edit projects used in the LogBook.' },
  { code: 'EDIT_ANY_EVENT', label: 'Edit any event', description: "Edit LogBook events created by other employees, not just your own." },
  { code: 'MANAGE_ANNOUNCEMENTS', label: 'Manage announcements', description: 'Post, edit, and delete company-wide announcements and their attachments.' },
]
