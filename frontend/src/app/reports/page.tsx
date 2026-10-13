import { getMonthlyReport } from "@/lib/serverApi"
import MonthlyReportChart from "@/components/MonthlyReportChart"
import YearPicker from "@/components/YearPicker"

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year: yearParam } = await searchParams
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : new Date().getFullYear()

  const data = await getMonthlyReport(year)

  const totalIncome  = data.reduce((s: number, m: any) => s + m.income,  0)
  const totalExpense = data.reduce((s: number, m: any) => s + m.expense, 0)
  const totalNet     = totalIncome - totalExpense

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <YearPicker year={year} />
      </div>

      {/* YTD summary */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div className="stat-tile">
          <span className="stat-label">Total Income</span>
          <span className="stat-value num" style={{ color: "var(--income)" }}>+฿{totalIncome.toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Total Expenses</span>
          <span className="stat-value num" style={{ color: "var(--expense)" }}>-฿{totalExpense.toLocaleString()}</span>
        </div>
        <div
          className="stat-tile stat-tile-net"
          style={{ ["--tone" as string]: totalNet >= 0 ? "var(--income)" : "var(--expense)" }}
        >
          <span className="stat-label">Net Saved</span>
          <span className="stat-value num" style={{ color: "var(--tone)" }}>
            {totalNet >= 0 ? "+" : ""}฿{totalNet.toLocaleString()}
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Avg Monthly Save</span>
          <span className="stat-value num">฿{Math.round(totalNet / 12).toLocaleString()}</span>
        </div>
      </div>

      {/* Chart */}
      <section>
        <h2 style={{ marginBottom: "16px" }}>Monthly Overview — {year}</h2>
        <MonthlyReportChart data={data} />
      </section>

      {/* Table */}
      <section>
        <h2 style={{ marginBottom: "12px" }}>Monthly Breakdown</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "right" }}>
                <th scope="col" style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Month</th>
                <th scope="col" style={{ padding: "8px 12px", fontWeight: 600, color: "var(--income)" }}>Income</th>
                <th scope="col" style={{ padding: "8px 12px", fontWeight: 600, color: "var(--expense)" }}>Expenses</th>
                <th scope="col" style={{ padding: "8px 12px", fontWeight: 600 }}>Net</th>
                <th scope="col" style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>Savings %</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m: any) => {
                const hasActivity = m.income > 0 || m.expense > 0
                const savPct = m.income > 0 ? Math.round((m.net / m.income) * 100) : null
                return (
                  <tr key={m.month} style={{
                    borderBottom: "1px solid var(--border)",
                    opacity: hasActivity ? 1 : 0.45,
                  }}>
                    <th scope="row" style={{ padding: "8px 12px", fontWeight: 500, textAlign: "left" }}>{MONTH_NAMES[m.month - 1]}</th>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--income)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}>
                      {m.income > 0 ? `+฿${m.income.toLocaleString()}` : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--expense)", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}>
                      {m.expense > 0 ? `-฿${m.expense.toLocaleString()}` : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)",
                      color: m.net > 0 ? "var(--income)" : m.net < 0 ? "var(--expense)" : "var(--text-secondary)" }}>
                      {hasActivity ? `${m.net >= 0 ? "+" : ""}฿${m.net.toLocaleString()}` : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                      {savPct !== null ? `${savPct}%` : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

