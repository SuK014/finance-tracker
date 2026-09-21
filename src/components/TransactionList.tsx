"use client"

import { useState } from "react"
import TransactionActions from "@/components/TransactionActions"

type Transaction = {
  id: number
  amount: number
  type: string
  date: string
  description?: string | null
  evidenceUrl?: string | null
  account?: { name: string } | null
  category?: { name: string; color?: string | null } | null
  accountId: number
  categoryId?: number | null
}

export default function TransactionList({
  transactions,
  accounts,
  categories,
}: {
  transactions: Transaction[]
  accounts: any[]
  categories: any[]
}) {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? transactions.filter(t =>
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.name.toLowerCase().includes(search.toLowerCase()) ||
        t.account?.name.toLowerCase().includes(search.toLowerCase())
      )
    : transactions

  function exportCsv() {
    const rows = [
      ["Date", "Type", "Amount", "Account", "Category", "Description"],
      ...filtered.map(t => [
        new Date(t.date).toISOString(),
        t.type,
        t.amount,
        t.account?.name ?? "",
        t.category?.name ?? "",
        t.description ?? "",
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search by description, category, or account…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", maxWidth: "360px" }}
        />
        <button type="button" onClick={exportCsv} style={{ whiteSpace: "nowrap" }}>
          Export CSV
        </button>
      </div>

      <ul style={{ marginTop: "4px" }}>
        {filtered.map((t) => (
          <li key={t.id} className="row-card">
            <span className="row-primary">
              {t.description || t.category?.name || t.account?.name || "Transaction"}
            </span>
            <span className="row-amount num" style={{ color: t.type === "income" ? "var(--income)" : "var(--expense)", fontWeight: 600 }}>
              {t.type === "income" ? "+" : "-"}฿{Number(t.amount).toLocaleString()}
            </span>
            <span className="row-meta">
              {t.category && (
                <span style={{
                  padding: "2px 8px", borderRadius: "999px", fontSize: "11px",
                  backgroundColor: t.category.color ?? "var(--text-muted)", color: "#fff",
                }}>
                  {t.category.name}
                </span>
              )}
              <span>{t.account?.name}</span>
              <span className="num">
                {new Date(t.date).toLocaleString("en-GB", {
                  timeZone: "Asia/Bangkok",
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </span>
            <TransactionActions transaction={t} accounts={accounts} categories={categories} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li style={{ color: "var(--text-muted)", border: "none", padding: "24px 0" }}>
            {search ? "No transactions match your search." : "No transactions yet."}
          </li>
        )}
      </ul>
    </>
  )
}
