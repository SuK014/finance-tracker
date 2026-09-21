import { getAccounts, getTransactions, getCategories } from "@/lib/serverApi"
import AccountFilter from "@/components/AccountFilter"
import TransactionList from "@/components/TransactionList"
import MonthNav from "@/components/MonthNav"
import Link from "next/link"

export default async function TransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string; month?: string }>
}) {
  const { accountId, month: monthParam } = await searchParams

  const now = new Date()
  let year: number, monthNum: number

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    ;[year, monthNum] = monthParam.split("-").map(Number)
  } else {
    year = now.getFullYear()
    monthNum = now.getMonth() + 1
  }

  const monthStr = `${year}-${String(monthNum).padStart(2, "0")}`

  const [accounts, transactions, categories] = await Promise.all([
    getAccounts(),
    getTransactions(accountId ? Number(accountId) : undefined, monthStr),
    getCategories(),
  ])

  const activeAccount = accountId
    ? accounts.find((a: any) => String(a.id) === accountId)
    : null

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>
          {activeAccount ? `${activeAccount.name} Transactions` : "All Transactions"}
        </h1>
        {activeAccount && (
          <Link href="/transactions" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            ← All accounts
          </Link>
        )}
        <Link
          href={accountId ? `/transactions/new?accountId=${accountId}` : "/transactions/new"}
          style={{
            marginLeft: "auto",
            padding: "6px 14px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius)",
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          + Add Transaction
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
        <MonthNav year={year} month={monthNum} basePath={accountId ? `/transactions?accountId=${accountId}` : "/transactions"} />
        <AccountFilter accounts={accounts} selected={accountId} month={monthStr} />
      </div>

      <TransactionList transactions={transactions} accounts={accounts} categories={categories} />
    </main>
  )
}
