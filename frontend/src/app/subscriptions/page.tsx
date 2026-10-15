import { getRecurring, getAccounts, getCategories } from "@/lib/serverApi"
import SubscriptionForm from "@/components/SubscriptionForm"
import SubscriptionList from "@/components/SubscriptionList"
import SectionTabs from "@/components/SectionTabs"

// Monthly equivalent of one subscription, so yearly plans compare fairly.
function perMonth(amount: number, frequency: string) {
  switch (frequency) {
    case "yearly": return amount / 12
    case "weekly": return (amount * 52) / 12
    case "daily": return (amount * 365) / 12
    default: return amount
  }
}

export default async function SubscriptionsPage() {
  const [items, accounts, categories] = await Promise.all([
    getRecurring(),
    getAccounts(),
    getCategories(),
  ])

  const active = items.filter((r: any) => r.active && r.type === "expense")
  const monthly = active.reduce((sum: number, r: any) => sum + perMonth(r.amount, r.frequency), 0)
  const money = (n: number) => `฿${Math.round(n).toLocaleString()}`

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <SectionTabs group="activity" />
      <h1 style={{ margin: 0 }}>Subscriptions</h1>

      {active.length > 0 && (
        <section className="hero" aria-label="Subscription cost">
          <div className="hero-label">You pay about</div>
          <div className="hero-amount num">{money(monthly)} <span style={{ fontSize: "0.4em", fontWeight: 600, opacity: 0.9 }}>a month</span></div>
          <div className="hero-sub">{money(monthly * 12)} a year across {active.length} subscription{active.length === 1 ? "" : "s"}</div>
        </section>
      )}

      <section aria-labelledby="active-h">
        <h2 id="active-h">Active</h2>
        <SubscriptionList items={items.filter((r: any) => r.type !== "income")} accounts={accounts} categories={categories} />
      </section>

      <SubscriptionForm accounts={accounts} categories={categories} />
    </main>
  )
}
