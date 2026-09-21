"use client"

import { useRouter } from "next/navigation"
import Select from "@/components/Select"

export default function YearPicker({ year }: { year: number }) {
  const router = useRouter()
  const current = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => current - 2 + i)

  return (
    <div style={{ width: "100px", flexShrink: 0 }}>
      <Select
        ariaLabel="Report year"
        value={String(year)}
        onChange={y => router.push(`/reports?year=${y}`)}
        options={years.map(y => ({ value: String(y), label: String(y) }))}
      />
    </div>
  )
}
