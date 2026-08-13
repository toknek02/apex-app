// Leave-type entries span the whole day rather than logged hours — the
// Activities Summary page uses this to render them without a duration.
export const LEAVE_EVENT_TYPES = [
  'Annual Leave',
  'Medical Leave (MC)',
  'Emergency Leave',
  'Unpaid Leave',
  'Marriage Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Compassionate Leave',
  'Study/Exam Leave',
  'Business Leave',
  'Time-off',
  'Hospitalisation Leave',
  'Seminar Leave',
]

export const EVENT_TYPES = ['Project Work', 'Admin Work', 'Marketing', ...LEAVE_EVENT_TYPES]

// What the manual Timesheet entry form offers, and what the direct POST
// /api/timesheet-entries endpoint accepts. Leave types are excluded — those
// can only enter the system via an approved leave application (see
// /api/leave-applications/[id]), which creates the TimesheetEntry itself.
export const SELF_SERVICE_EVENT_TYPES = EVENT_TYPES.filter((t) => !LEAVE_EVENT_TYPES.includes(t))
