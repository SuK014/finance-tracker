"use client"

import { useRouter } from "next/navigation"
import Select from "@/components/Select"

type Account = { id: number; name: string }

export default function AccountFilter({
  accounts,
  selected,
  month,
}: {
  accounts: Account[]
  selected?: string
  month?: string
}) {
  const router = useRouter()

  return (
    <div style={{ width: "160px", flexShrink: 0 }}>
      <Select
        ariaLabel="Filter by account"
        value={selected ?? ""}
        onChange={val => {
          const monthParam = month ? `&month=${month}` : ""
          router.push(val ? `/transactions?accountId=${val}${monthParam}` : `/transactions${month ? `?month=${month}` : ""}`)
        }}
        options={[
          { value: "", label: "All accounts" },
          ...accounts.map(a => ({ value: String(a.id), label: a.name })),
        ]}
      />
    </div>
  )
}
