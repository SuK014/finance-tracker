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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Link
          href={accountId ? `/transactions?accountId=${accountId}` : "/transactions"}
          style={{ color: "var(--text-muted)", fontSize: "13px" }}
        >
          ← Back
        </Link>
        <h1 style={{ margin: 0 }}>Add Transaction</h1>
      </div>
      <AddTransactionForm accounts={accounts} categories={categories} defaultAccountId={accountId} />
    </main>
  )
}
