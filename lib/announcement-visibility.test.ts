import { describe, it, expect } from 'vitest'
import { announcementVisibleTo } from '@/lib/announcement-visibility'

const user = { id: 'u1', permissions: [] }

describe('announcementVisibleTo', () => {
  it('restricts a normal user to company-wide plus their own targeted ones', () => {
    expect(announcementVisibleTo(user, false)).toEqual({
      OR: [{ recipients: { none: {} } }, { recipients: { some: { userId: 'u1' } } }],
    })
  })

  it('lets a manager see everything, for oversight', () => {
    expect(announcementVisibleTo(user, true)).toEqual({})
  })

  // Regression guard: the attachment download route enforced no visibility at
  // all, so any logged-in user could fetch a targeted announcement's files.
  it('never returns an unfiltered clause for a non-manager', () => {
    expect(Object.keys(announcementVisibleTo(user, false))).not.toHaveLength(0)
  })
})
