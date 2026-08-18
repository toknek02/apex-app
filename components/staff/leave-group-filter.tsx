'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type LeaveGroupOption = { id: string; name: string }

export function LeaveGroupFilter({
  leaveGroups,
  selected,
  basePath = '/staff/activities/summary',
}: {
  leaveGroups: LeaveGroupOption[]
  selected: string
  basePath?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(leaveGroupId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (leaveGroupId) {
      params.set('leaveGroup', leaveGroupId)
    } else {
      params.delete('leaveGroup')
    }
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <select
      value={selected}
      onChange={(e) => handleChange(e.target.value)}
      style={{ padding: '5px 8px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12 }}
    >
      <option value="">All Groups</option>
      {leaveGroups.map((g) => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  )
}
