import { getRecurring, getAccounts, getCategories } from "@/lib/serverApi"
import RecurringForm from "@/components/RecurringForm"
import RecurringList from "@/components/RecurringList"

export default async function RecurringPage() {
  const [recurring, accounts, categories] = await Promise.all([
    getRecurring(),
    getAccounts(),
    getCategories(),
  ])

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <h1 style={{ margin: 0 }}>Recurring Transactions</h1>

      <RecurringForm accounts={accounts} categories={categories} />

      <section>
        <h2 style={{ marginBottom: "12px" }}>Active</h2>
        <RecurringList items={recurring} accounts={accounts} categories={categories} />
      </section>
    </main>
  )
}
