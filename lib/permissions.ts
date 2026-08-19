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
  | 'RECEIVE_HR_LEAVE_NOTIFICATIONS'
  | 'MANAGE_LEAVE_GROUPS'
  | 'MANAGE_PUBLIC_HOLIDAYS'

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
  { code: 'VIEW_TIMESHEET_REPORTS', label: 'View timesheet reports', description: 'View any staff member’s individual timesheet, and project-wide team cost reports.' },
  { code: 'MANAGE_TIMESHEET_ENTRIES', label: 'Manage timesheet entries', description: 'Delete timesheet entries submitted by other staff, for corrections.' },
  { code: 'MANAGE_SETTINGS', label: 'Manage settings', description: 'Configure system-wide settings such as the office location used for attendance sign-in.' },
  { code: 'VIEW_AUDIT_LOG', label: 'View audit log', description: 'View the history of administrative actions: user, role, venue, project, and settings changes.' },
  { code: 'VIEW_ERROR_LOG', label: 'View error log', description: 'View server and browser errors captured by the application for troubleshooting.' },
  { code: 'RECEIVE_HR_LEAVE_NOTIFICATIONS', label: 'Receive HR leave notifications', description: 'Get notified whenever any staff member applies for leave or has a leave application decided, regardless of group.' },
  { code: 'MANAGE_LEAVE_GROUPS', label: 'Manage groups', description: 'Create groups and assign each one a director — the person who approves that group’s leave applications.' },
  { code: 'MANAGE_PUBLIC_HOLIDAYS', label: 'Manage public holidays', description: 'Add and remove the dates HR designates as public holidays, used to apply the public-holiday OT rate.' },
]
