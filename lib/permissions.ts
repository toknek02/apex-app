export type PermissionCode =
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES'
  | 'MANAGE_VENUES'
  | 'MANAGE_PROJECTS'
  | 'EDIT_ANY_EVENT'
  | 'MANAGE_ANNOUNCEMENTS'
  | 'VIEW_TIMESHEET_REPORTS'
  | 'MANAGE_TIMESHEET_ENTRIES'
  | 'MANAGE_SETTINGS'
  | 'VIEW_AUDIT_LOG'
  | 'VIEW_ERROR_LOG'

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
  { code: 'VIEW_TIMESHEET_REPORTS', label: 'View timesheet reports', description: 'View timesheet entries for all staff on a project, for cost evaluation.' },
  { code: 'MANAGE_TIMESHEET_ENTRIES', label: 'Manage timesheet entries', description: 'Delete timesheet entries submitted by other staff, for corrections.' },
  { code: 'MANAGE_SETTINGS', label: 'Manage settings', description: 'Configure system-wide settings such as the office location used for attendance sign-in.' },
  { code: 'VIEW_AUDIT_LOG', label: 'View audit log', description: 'View the history of administrative actions: user, role, venue, project, and settings changes.' },
  { code: 'VIEW_ERROR_LOG', label: 'View error log', description: 'View server and browser errors captured by the application for troubleshooting.' },
]
