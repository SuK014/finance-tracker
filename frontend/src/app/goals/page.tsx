import { getAccounts, getCategories, getGoals } from "@/lib/serverApi"
import SectionTabs from "@/components/SectionTabs"
import GoalsView from "@/components/GoalsView"

export default async function GoalsPage() {
  const [goals, accounts, categories] = await Promise.all([getGoals(), getAccounts(), getCategories()])

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "720px" }}>
      <SectionTabs group="wealth" />
      <GoalsView goals={goals} accounts={accounts} categories={categories} />
    </main>
  )
}
