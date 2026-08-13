'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function DepartmentFilter({ departments, selected }: { departments: string[]; selected: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(department: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (department) {
      params.set('department', department)
    } else {
      params.delete('department')
    }
    router.push(`/staff/activities/summary?${params.toString()}`)
  }

  return (
    <select
      value={selected}
      onChange={(e) => handleChange(e.target.value)}
      style={{ padding: '5px 8px', border: '1px solid var(--apex-border)', borderRadius: 6, fontSize: 12 }}
    >
      <option value="">All Departments</option>
      {departments.map((d) => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
  )
}
