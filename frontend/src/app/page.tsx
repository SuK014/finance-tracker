import { getTransactions, getCategories, getRecurring } from "@/lib/serverApi"
import DailyActivityChart from "@/components/DailyActivityChart"
import CategoryBarChart from "@/components/CategoryBarChart"
import TransactionCalendar from "@/components/TransactionCalendar"
import MonthNav from "@/components/MonthNav"
import CategoryIcon from "@/components/CategoryIcon"
import SubscriptionIcon from "@/components/ServiceIcon"
import { categoryEmoji } from "@/lib/categoryIcon"
import Link from "next/link"

type CatTotal = { name: string; value: number; color?: string | null; icon?: string | null; budget?: number | null }

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

  const byCat: Record<string, CatTotal> = {}
  transactions
    .filter((t: any) => t.type === "expense" && t.category)
    .forEach((t: any) => {
      const k = String(t.category.id)
      if (!byCat[k]) byCat[k] = { name: t.category.name, value: 0, color: t.category.color, icon: t.category.icon, budget: null }
      byCat[k].value += t.amount
    })

  // Attach budgets from categories list
  for (const cat of categories) {
    if (cat.budget != null && byCat[String(cat.id)]) {
      byCat[String(cat.id)].budget = cat.budget
    } else if (cat.budget != null && cat.type === "expense") {
      byCat[String(cat.id)] = { name: cat.name, value: 0, color: cat.color, icon: cat.icon, budget: cat.budget }
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

  // Hero: spent vs budget when budgets exist, otherwise spent vs income.
  const totalBudget = categoryData.reduce((sum, c) => sum + (c.budget ?? 0), 0)
  const budgetedSpent = categoryData.filter(c => c.budget != null).reduce((sum, c) => sum + c.value, 0)
  const hasBudget = totalBudget > 0
  const heroBase = hasBudget ? totalBudget : income
  const heroSpent = hasBudget ? budgetedSpent : expenses
  const heroPct = heroBase > 0 ? Math.min(100, Math.round((heroSpent / heroBase) * 100)) : 0
  const heroOver = heroBase > 0 && heroSpent > heroBase
  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-GB", { month: "long" })
  const hour = Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }))
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const topCats = categoryData.filter(c => c.value > 0).slice(0, 3)
  const money = (n: number) => `฿${Math.round(n).toLocaleString()}`

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="home-head">
        <h1 className="home-greeting">{greeting} 👋</h1>
        <MonthNav year={year} month={month} />
      </div>

      <div className="top-grid">
      <section className="hero" aria-label={`${monthLabel} summary`}>
        <div className="hero-label">Spent in {monthLabel}</div>
        <div className="hero-amount num">{money(expenses)}</div>
        <div className="hero-sub">
          {hasBudget
            ? heroOver
              ? `${money(heroSpent - totalBudget)} over your ${money(totalBudget)} budget`
              : `${money(totalBudget - heroSpent)} left of your ${money(totalBudget)} budget`
            : income > 0
              ? `${money(income)} earned this month`
              : "Set category budgets to track what's left"}
        </div>
        {heroBase > 0 && (
          <>
            <div
              className="hero-bar"
              data-over={heroOver}
              role="progressbar"
              aria-label={hasBudget ? "Budget used" : "Income spent"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={heroPct}
            >
              <i style={{ width: `${heroPct}%` }} />
            </div>
            <div className="hero-sub">{heroPct}% {hasBudget ? "of budget used" : "of income spent"}</div>
          </>
        )}
        {topCats.length > 0 && (
          <div className="hero-chips">
            {topCats.map(c => (
              <span key={c.name} className="hero-chip">
                {categoryEmoji({ icon: c.icon, name: c.name })} {c.name} {expenses > 0 ? Math.round((c.value / expenses) * 100) : 0}%
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="pill-row">
        <div className="pill-card pill-sky">
          <small>{net >= 0 ? "Saved" : "Overspent"}</small>
          <b className="num" style={net < 0 ? { color: "var(--expense)" } : undefined}>{net >= 0 ? "" : "-"}{money(Math.abs(net))}</b>
          {income > 0 && <small style={{ marginTop: 2 }}>{savingsRate}% of income</small>}
        </div>
        <Link href="/subscriptions" className="pill-card pill-peach">
          <small>Renewing this week</small>
          <b className="num">{upcomingRecurring.length}</b>
          <small style={{ marginTop: 2 }}>{upcomingRecurring.length === 0 ? "Nothing due" : "View subscriptions"}</small>
        </Link>
      </div>

      </div>

      <div className="home-grid">
        <section className="card" aria-labelledby="recent-h">
          <div className="section-head">
            <h2 id="recent-h">Recent</h2>
            <Link href="/transactions">See all</Link>
          </div>
          {transactions.length === 0 ? (
            <div className="empty-state">
              <span className="big" aria-hidden="true">🧾</span>
              Nothing logged in {monthLabel} yet. Tap + to add your first transaction.
            </div>
          ) : (
            <ul>
              {transactions.slice(0, 8).map((t: any) => (
                <li key={t.id} className="tx-row">
                  <CategoryIcon category={t.category ?? { type: t.type }} />
                  <div className="tx-main">
                    <div className="tx-title">{t.description || t.category?.name || "Transaction"}</div>
                    <div className="tx-sub">
                      {t.category?.name ? `${t.category.name} · ` : ""}
                      {new Date(t.date).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <span className="tx-amount num" style={{ color: t.type === "income" ? "var(--income)" : "var(--expense)" }}>
                    {t.type === "income" ? "+" : "-"}฿{Number(t.amount).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
          {categoryData.some(c => c.budget != null) && (
            <section className="card" aria-labelledby="budgets-h">
              <h2 id="budgets-h">Budgets</h2>
              {categoryData.filter(c => c.budget != null).map(c => {
                const pct = Math.min(100, Math.round((c.value / c.budget!) * 100))
                const over = c.value > c.budget!
                return (
                  <div key={c.name} className="budget-row">
                    <div className="budget-top">
                      <span><CategoryIcon category={c} size="sm" />{c.name}</span>
                      <span className="num" style={{ color: over ? "var(--expense)" : "var(--text-secondary)", fontWeight: 600 }}>
                        {money(c.value)} / {money(c.budget!)}
                      </span>
                    </div>
                    <div className="budget-track">
                      <i style={{ width: `${pct}%`, background: over ? "var(--expense)" : (c.color ?? "var(--accent)") }} />
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          <section className="card" aria-labelledby="cat-h">
            <h2 id="cat-h">Where it went</h2>
            <CategoryBarChart data={categoryData} />
          </section>
        </div>
      </div>

      <section className="card" aria-labelledby="daily-h">
        <h2 id="daily-h">Daily activity</h2>
        <DailyActivityChart data={dailyData} />
      </section>

      {upcomingRecurring.length > 0 && (
        <section className="card" aria-labelledby="upcoming-h">
          <h2 id="upcoming-h">Renewing soon</h2>
          <ul>
            {upcomingRecurring.map((r: any) => {
              const d = new Date(r.nextDate)
              const isPast = d < today
              return (
                <li key={r.id} className="tx-row">
                  <SubscriptionIcon description={r.description} category={r.category ?? { type: r.type }} />
                  <div className="tx-main">
                    <div className="tx-title">{r.description || r.category?.name || "Subscription"}</div>
                    <div className="tx-sub" style={{ color: isPast ? "var(--expense)" : undefined, fontWeight: isPast ? 600 : 400 }}>
                      {isPast ? "Overdue · " : ""}
                      {d.toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" })} · {r.frequency}
                    </div>
                  </div>
                  <span className="tx-amount num" style={{ color: r.type === "income" ? "var(--income)" : "var(--expense)" }}>
                    {r.type === "income" ? "+" : "-"}฿{Number(r.amount).toLocaleString()}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="cal-h">
        <h2 id="cal-h">Calendar</h2>
        <TransactionCalendar transactions={transactions} year={year} month={month} />
      </section>
    </main>
  )
}
