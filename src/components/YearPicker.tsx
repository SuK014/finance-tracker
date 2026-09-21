"use client"

import { useRouter } from "next/navigation"

export default function YearPicker({ year }: { year: number }) {
  const router = useRouter()
  const current = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => current - 2 + i)

  return (
    <select
      value={year}
      onChange={e => router.push(`/reports?year=${e.target.value}`)}
      style={{ fontSize: "14px" }}
    >
      {years.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  )
}
