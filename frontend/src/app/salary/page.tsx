import { getAccounts, getGoals, getRecurring } from "@/lib/serverApi"
import SectionTabs from "@/components/SectionTabs"
import Payday from "@/components/Payday"

export default async function SalaryPage() {
  const [goals, accounts, recurring] = await Promise.all([getGoals(), getAccounts(), getRecurring()])
  const salary = recurring.find((r: any) => r.active && r.type === "income") ?? null

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "720px" }}>
      <SectionTabs group="wealth" />
      <h1 style={{ margin: 0 }}>Salary</h1>
      <Payday salary={salary} goals={goals} accounts={accounts} />
    </main>
  )
}
