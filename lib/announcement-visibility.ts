// An announcement with no recipients is company-wide; with recipients, only
// those people can see it — except MANAGE_ANNOUNCEMENTS holders, who see
// everything for oversight/editing.
//
// Kept here rather than inline so the list and the attachment download can't
// drift apart: the download used to enforce nothing at all, leaving a targeted
// announcement's files readable by anyone holding the link.
export function announcementVisibleTo(user: { id: string; permissions: string[] }, canManage: boolean) {
  if (canManage) return {}
  return { OR: [{ recipients: { none: {} } }, { recipients: { some: { userId: user.id } } }] }
}
