import { getAccounts, getPortfolio } from "@/lib/serverApi"
import { currencySymbol as sym } from "@/lib/currency"

export default async function NetWorthPage() {
  const [accounts, holdings] = await Promise.all([getAccounts(), getPortfolio()])

  // Group accounts by currency, splitting credit cards out as liabilities
  // (debt) rather than folding them silently into the same "Accounts" list —
  // their balance already goes negative from expense transactions, but that
  // was easy to miss without a dedicated, clearly-labeled section.
  const byCurrency: Record<string, { assetAccounts: typeof accounts; liabilityAccounts: typeof accounts; total: number }> = {}
  for (const acc of accounts) {
    const cur = acc.currency ?? "THB"
    if (!byCurrency[cur]) byCurrency[cur] = { assetAccounts: [], liabilityAccounts: [], total: 0 }
    if (acc.type === "credit_card") byCurrency[cur].liabilityAccounts.push(acc)
    else byCurrency[cur].assetAccounts.push(acc)
    byCurrency[cur].total += acc.balance ?? 0
  }

  // Group portfolio by currency
  const portfolioByCurrency: Record<string, number> = {}
  for (const h of holdings) {
    const cur = h.currency ?? "USD"
    if (!portfolioByCurrency[cur]) portfolioByCurrency[cur] = 0
    portfolioByCurrency[cur] += (h.price ?? 0) * (h.quantity ?? 0)
  }

  const allCurrencies = Array.from(new Set([
    ...Object.keys(byCurrency),
    ...Object.keys(portfolioByCurrency),
  ])).sort()

  const sectionStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  }

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    padding: "4px 0",
    borderBottom: "1px solid var(--border)",
  }

  const totalRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: 700,
    fontSize: "16px",
    paddingTop: "8px",
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "640px" }}>
      <h1 style={{ margin: 0 }}>Net Worth</h1>

      {allCurrencies.map(cur => {
        const accountGroup = byCurrency[cur]
        const portfolioValue = portfolioByCurrency[cur] ?? 0
        const accountTotal = accountGroup?.total ?? 0
        const grandTotal = accountTotal + portfolioValue

        return (
          <div key={cur} style={sectionStyle}>
            <h2 style={{ margin: 0, fontSize: "15px", color: "var(--text-secondary)" }}>{cur}</h2>

            {accountGroup && accountGroup.assetAccounts.length > 0 && (
              <>
                <h3 style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Accounts
                </h3>
                {accountGroup.assetAccounts.map((acc: any) => (
                  <div key={acc.id} style={rowStyle}>
                    <span>{acc.name}</span>
                    <span className="num" style={{
                      color: (acc.balance ?? 0) >= 0 ? "var(--income)" : "var(--expense)",
                    }}>
                      {sym(cur)}{(acc.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </>
            )}

            {portfolioValue > 0 && (
              <>
                <h3 style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Portfolio
                </h3>
                {holdings.filter((h: any) => (h.currency ?? "USD") === cur).map((h: any) => (
                  <div key={h.symbol} style={rowStyle}>
                    <span>{h.symbol} <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>×{h.quantity}</span></span>
                    <span className="num">
                      {sym(cur)}{((h.price ?? 0) * h.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </>
            )}

            {accountGroup && accountGroup.liabilityAccounts.length > 0 && (
              <>
                <h3 style={{ margin: 0, fontSize: "13px", color: "var(--expense)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Debt
                </h3>
                {accountGroup.liabilityAccounts.map((acc: any) => (
                  <div key={acc.id} style={rowStyle}>
                    <span>{acc.name}</span>
                    <span className="num" style={{ color: "var(--expense)" }}>
                      {(acc.balance ?? 0) < 0 ? "-" : ""}{sym(cur)}{Math.abs(acc.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </>
            )}

            <div style={totalRowStyle}>
              <span>Total {cur}</span>
              <span className="num" style={{ color: grandTotal >= 0 ? "var(--income)" : "var(--expense)" }}>
                {sym(cur)}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )
      })}

      {allCurrencies.length === 0 && (
        <p style={{ color: "var(--text-secondary)" }}>No accounts or assets yet.</p>
      )}
    </main>
  )
}
