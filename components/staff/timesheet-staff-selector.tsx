'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type StaffOption = { id: string; name: string }

export function TimesheetStaffSelector({ staff, selectedUserId }: { staff: StaffOption[]; selectedUserId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(userId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (userId) {
      params.set('userId', userId)
    } else {
      params.delete('userId')
    }
    router.push(`/staff/timesheet?${params.toString()}`)
  }

  return (
    <select
      value={selectedUserId}
      onChange={(e) => handleChange(e.target.value)}
      style={{ padding: '6px 10px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12 }}
    >
      {staff.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  )
}
