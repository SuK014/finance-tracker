import { getAccounts, getCategories } from "@/lib/serverApi"
import AddTransactionForm from "@/components/AddTransactionForm"
import Link from "next/link"

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>
}) {
  const { accountId } = await searchParams

  const [accounts, categories] = await Promise.all([
    getAccounts(),
    getCategories(),
  ])

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Add Transaction</h1>
        <Link
          href={accountId ? `/transactions?accountId=${accountId}` : "/transactions"}
          style={{
            marginLeft: "auto",
            padding: "6px 14px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text-primary)",
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          View all transactions
        </Link>
      </div>
      <AddTransactionForm accounts={accounts} categories={categories} defaultAccountId={accountId} />
    </main>
  )
}
