"use client"

import { useState } from "react"

type Transaction = {
  id: number
  amount: number
  type: string
  date: string
  description?: string | null
  category?: { name: string; color?: string | null } | null
  account?: { name: string } | null
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function TransactionCalendar({
  transactions,
  year,
  month,
}: {
  transactions: Transaction[]
  year: number
  month: number
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const byDay: Record<number, Transaction[]> = {}
  transactions.forEach(t => {
    const d = new Date(t.date).getDate()
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(t)
  })

  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const todayDate = today.getDate()

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedTxns = selectedDay ? (byDay[selectedDay] ?? []) : []
  const selectedIncome = selectedTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const selectedExpense = selectedTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })

  return (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "2px",
        background: "var(--border)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "hidden",
      }}>
        {DAYS.map(d => (
          <div key={d} style={{
            background: "var(--surface)",
            padding: "6px 0",
            textAlign: "center",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} style={{ background: "var(--bg)", minHeight: "72px" }} />
          const txns = byDay[day] ?? []
          const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
          const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
          const isToday = isCurrentMonth && day === todayDate
          const hasTxns = txns.length > 0

          return (
            <div
              key={day}
              onClick={() => hasTxns && setSelectedDay(day)}
              style={{
                background: "var(--surface)",
                minHeight: "72px",
                padding: "6px 8px",
                cursor: hasTxns ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => hasTxns && ((e.currentTarget as HTMLDivElement).style.background = "var(--bg)")}
              onMouseLeave={e => hasTxns && ((e.currentTarget as HTMLDivElement).style.background = "var(--surface)")}
            >
              <span style={{
                fontSize: "12px",
                fontWeight: isToday ? 700 : 400,
                width: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: isToday ? "var(--accent)" : "transparent",
                color: isToday ? "#fff" : "var(--text-primary)",
              }}>
                {day}
              </span>
              {expense > 0 && (
                <span style={{ fontSize: "10px", color: "var(--expense)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}>
                  -฿{expense.toLocaleString()}
                </span>
              )}
              {income > 0 && (
                <span style={{ fontSize: "10px", color: "var(--income)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}>
                  +฿{income.toLocaleString()}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {selectedDay !== null && (
        <div
          onClick={() => setSelectedDay(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: "12px",
              padding: "24px",
              minWidth: "320px",
              maxWidth: "480px",
              width: "90vw",
              maxHeight: "70vh",
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>
                  {selectedDay} {monthLabel}
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "13px" }}>
                  {selectedIncome > 0 && <span style={{ color: "var(--income)" }}>+฿{selectedIncome.toLocaleString()}</span>}
                  {selectedExpense > 0 && <span style={{ color: "var(--expense)" }}>-฿{selectedExpense.toLocaleString()}</span>}
                </div>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
              >
                ✕
              </button>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {selectedTxns.map(t => (
                <li key={t.id} style={{
                  display: "flex", gap: "10px", alignItems: "flex-start",
                  padding: "10px", background: "var(--bg)", borderRadius: "8px",
                }}>
                  <span style={{
                    color: t.type === "income" ? "var(--income)" : "var(--expense)",
                    fontWeight: 600, minWidth: "80px", fontSize: "14px",
                    fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)",
                  }}>
                    {t.type === "income" ? "+" : "-"}฿{Number(t.amount).toLocaleString()}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                    {t.category && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        fontSize: "11px",
                      }}>
                        <span style={{
                          width: "8px", height: "8px", borderRadius: "50%",
                          background: t.category.color ?? "#888", display: "inline-block",
                        }} />
                        {t.category.name}
                      </span>
                    )}
                    {t.description && (
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{t.description}</span>
                    )}
                    {t.account && (
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t.account.name}</span>
                    )}
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>
                    {new Date(t.date).toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
