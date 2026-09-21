"use client"

import { useRouter } from "next/navigation"

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
    <select
      value={selected ?? ""}
      onChange={e => {
        const val = e.target.value
        const monthParam = month ? `&month=${month}` : ""
        router.push(val ? `/transactions?accountId=${val}${monthParam}` : `/transactions${month ? `?month=${month}` : ""}`)
      }}
    >
      <option value="">All accounts</option>
      {accounts.map(a => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  )
}
