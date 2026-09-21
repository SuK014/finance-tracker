import { getTransactions, getCategories, getRecurring } from "@/lib/serverApi"
import DailyActivityChart from "@/components/DailyActivityChart"
import CategoryBarChart from "@/components/CategoryBarChart"
import TransactionCalendar from "@/components/TransactionCalendar"
import MonthNav from "@/components/MonthNav"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams

  const now = new Date()
  let year: number, month: number

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    ;[year, month] = monthParam.split("-").map(Number)
  } else {
    year = now.getFullYear()
    month = now.getMonth() + 1
  }

  const monthStr = `${year}-${String(month).padStart(2, "0")}`
  const [transactions, categories, recurring] = await Promise.all([
    getTransactions(undefined, monthStr),
    getCategories(),
    getRecurring(),
  ])

  const income = transactions
    .filter((t: any) => t.type === "income")
    .reduce((sum: number, t: any) => sum + t.amount, 0)

  const expenses = transactions
    .filter((t: any) => t.type === "expense")
    .reduce((sum: number, t: any) => sum + t.amount, 0)

  const net = income - expenses
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0

  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const dayTxns = transactions.filter((t: any) => new Date(t.date).getDate() === day)
    return {
      date: String(day),
      income:  dayTxns.filter((t: any) => t.type === "income") .reduce((s: number, t: any) => s + t.amount, 0),
      expense: dayTxns.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0),
    }
  })

  const byCat: Record<string, { name: string; value: number; color?: string | null; budget?: number | null }> = {}
  transactions
    .filter((t: any) => t.type === "expense" && t.category)
    .forEach((t: any) => {
      const k = String(t.category.id)
      if (!byCat[k]) byCat[k] = { name: t.category.name, value: 0, color: t.category.color, budget: null }
      byCat[k].value += t.amount
    })

  // Attach budgets from categories list
  for (const cat of categories) {
    if (cat.budget != null && byCat[String(cat.id)]) {
      byCat[String(cat.id)].budget = cat.budget
    } else if (cat.budget != null && cat.type === "expense") {
      byCat[String(cat.id)] = { name: cat.name, value: 0, color: cat.color, budget: cat.budget }
    }
  }

  const categoryData = Object.values(byCat).sort((a, b) => b.value - a.value)

  // Upcoming recurring (next 7 days and overdue)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7 = new Date(today)
  in7.setDate(in7.getDate() + 7)
  const upcomingRecurring = recurring
    .filter((r: any) => r.active && new Date(r.nextDate) <= in7)
    .sort((a: any, b: any) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
    .slice(0, 5)

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <MonthNav year={year} month={month} />

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div className="stat-tile">
          <span className="stat-label">Income</span>
          <span className="stat-value num" style={{ color: "var(--income)" }}>+฿{income.toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Expenses</span>
          <span className="stat-value num" style={{ color: "var(--expense)" }}>-฿{expenses.toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Net</span>
          <span className="stat-value num" style={{ color: net >= 0 ? "var(--income)" : "var(--expense)" }}>
            {net >= 0 ? "+" : ""}฿{net.toLocaleString()}
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Savings Rate</span>
          <span className="stat-value num" style={{ color: "var(--text-primary)" }}>{savingsRate}%</span>
        </div>
      </div>

      <section>
        <h2 style={{ marginBottom: "12px" }}>Daily Activity</h2>
        <DailyActivityChart data={dailyData} />
      </section>

      <div className="two-col-grid">
        <section>
          <h2 style={{ marginBottom: "12px" }}>Spending by Category</h2>
          <CategoryBarChart data={categoryData} />
          {categoryData.some(c => c.budget != null) && (
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Budget Progress</h3>
              {categoryData.filter(c => c.budget != null).map(c => {
                const pct = Math.min(100, Math.round((c.value / c.budget!) * 100))
                const over = c.value > c.budget!
                return (
                  <div key={c.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {c.color && <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: c.color }} />}
                        {c.name}
                      </span>
                      <span className="num" style={{ color: over ? "var(--expense)" : "var(--text-secondary)" }}>
                        ฿{c.value.toLocaleString()} / ฿{c.budget!.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "3px", background: "var(--border)" }}>
                      <div style={{
                        height: "100%", borderRadius: "3px",
                        width: `${pct}%`,
                        background: over ? "var(--expense)" : (c.color ?? "var(--accent)"),
                        transition: "width var(--dur-slow) var(--ease-out)",
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ marginBottom: "12px" }}>Recent Transactions</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            {transactions.slice(0, 8).map((t: any) => (
              <li key={t.id} style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px" }}>
                <span className="num" style={{ color: t.type === "income" ? "var(--income)" : "var(--expense)", minWidth: "90px" }}>
                  {t.type === "income" ? "+" : "-"}฿{Number(t.amount).toLocaleString()}
                </span>
                {t.category && (
                  <span style={{
                    padding: "2px 8px", borderRadius: "999px", fontSize: "11px",
                    backgroundColor: t.category.color ?? "var(--text-muted)", color: "#fff",
                  }}>
                    {t.category.name}
                  </span>
                )}
                <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.description}
                </span>
                <span className="num" style={{ marginLeft: "auto", color: "var(--text-muted)", flexShrink: 0, fontSize: "12px" }}>
                  {new Date(t.date).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
            {transactions.length === 0 && (
              <li style={{ color: "var(--text-muted)" }}>No transactions this month.</li>
            )}
          </ul>
        </section>
      </div>

      {upcomingRecurring.length > 0 && (
        <section>
          <h2 style={{ marginBottom: "12px" }}>Upcoming Recurring</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {upcomingRecurring.map((r: any) => {
              const d = new Date(r.nextDate)
              const isPast = d < today
              return (
                <li key={r.id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 14px", borderRadius: "var(--radius)",
                  background: "var(--surface)", border: `1px solid ${isPast ? "var(--expense)" : "var(--border)"}`,
                  fontSize: "13px",
                }}>
                  <span className="num" style={{ color: r.type === "income" ? "var(--income)" : "var(--expense)", fontWeight: 600, minWidth: "80px" }}>
                    {r.type === "income" ? "+" : "-"}฿{Number(r.amount).toLocaleString()}
                  </span>
                  <span style={{ flex: 1 }}>{r.description || r.category?.name || "—"}</span>
                  <span style={{ fontSize: "12px", color: isPast ? "var(--expense)" : "var(--text-muted)", fontWeight: isPast ? 600 : 400 }}>
                    {isPast ? "Overdue" : ""} {d.toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" })}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>{r.frequency}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 style={{ marginBottom: "12px" }}>Calendar</h2>
        <TransactionCalendar transactions={transactions} year={year} month={month} />
      </section>
    </main>
  )
}
