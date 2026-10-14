"use client"

import { useState } from "react"
import TransactionActions from "@/components/TransactionActions"
import { categoryEmoji } from "@/lib/categoryIcon"

type Transaction = {
  id: number
  amount: number
  type: string
  date: string
  description?: string | null
  evidenceUrl?: string | null
  account?: { name: string } | null
  category?: { name: string; color?: string | null; icon?: string | null; type?: string | null } | null
  accountId: number
  categoryId?: number | null
  source?: string | null
}

const TZ = "Asia/Bangkok"
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ })

function dayLabel(key: string) {
  const now = Date.now()
  if (key === dayKey(new Date(now).toISOString())) return "Today"
  if (key === dayKey(new Date(now - 86400000).toISOString())) return "Yesterday"
  // Built by hand: "Sep" vs "Sept" differs between browsers' locale data.
  const [y, m, d] = key.split("-").map(Number)
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${weekday}, ${d} ${MONTHS[m - 1]} ${y}`
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

  // Newest first, grouped by Bangkok calendar day, with each day's net total.
  const groups: { key: string; label: string; net: number; items: Transaction[] }[] = []
  for (const t of filtered) {
    const key = dayKey(t.date)
    let g = groups[groups.length - 1]
    if (!g || g.key !== key) {
      g = { key, label: dayLabel(key), net: 0, items: [] }
      groups.push(g)
    }
    g.items.push(t)
    g.net += (t.type === "income" ? 1 : -1) * Number(t.amount)
  }

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
          placeholder="Search transactions"
          aria-label="Search by description, category, or account"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", maxWidth: "360px" }}
        />
        <button type="button" onClick={exportCsv} style={{ whiteSpace: "nowrap" }}>
          Export CSV
        </button>
      </div>

      {groups.map(g => (
        <section key={g.key} className="day-group" aria-label={g.label}>
          <h3 className="day-head">
            <span>{g.label}</span>
            <span className="num day-total" style={{ color: g.net < 0 ? "var(--expense)" : "var(--income)" }}>
              {g.net < 0 ? "-" : "+"}฿{Math.abs(g.net).toLocaleString()}
            </span>
          </h3>
          <ul>
            {g.items.map((t) => (
              <li key={t.id} className="row-card">
                <span className="row-primary">
                  {t.description || t.category?.name || t.account?.name || "Transaction"}
                </span>
                <span className="row-amount num" style={{ color: t.type === "income" ? "var(--income)" : "var(--expense)", fontWeight: 600 }}>
                  {t.type === "income" ? "+" : "-"}฿{Number(t.amount).toLocaleString()}
                </span>
                <span className="row-meta">
                  {t.source === "investment" && (
                    <span className="category-pill">
                      <span aria-hidden="true">📈</span>
                      Investment
                    </span>
                  )}
                  {t.category && (
                    <span className="category-pill">
                      <span aria-hidden="true">{categoryEmoji(t.category)}</span>
                      {t.category.name}
                    </span>
                  )}
                  <span>{t.account?.name}</span>
                  <span className="num">
                    {new Date(t.date).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
                <TransactionActions transaction={t} accounts={accounts} categories={categories} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <ul style={{ marginTop: "4px" }}>
        {filtered.length === 0 && (
          <li style={{ color: "var(--text-muted)", border: "none", padding: "24px 0" }}>
            {search ? "No transactions match your search." : "No transactions yet."}
          </li>
        )}
      </ul>
    </>
  )
}
