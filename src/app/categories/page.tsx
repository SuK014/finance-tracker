import { getCategories, getTransactions } from "@/lib/serverApi"
import AddCategoryForm from "@/components/AddCategoryForm"
import CategoryActions from "@/components/CategoryActions"

type Category = { id: number; name: string; color?: string | null; type?: string; budget?: number | null }

export default async function CategoriesPage() {
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [categories, transactions]: [Category[], any[]] = await Promise.all([
    getCategories(),
    getTransactions(undefined, monthStr),
  ])

  // Spending this month per category
  const spent: Record<number, number> = {}
  for (const t of transactions) {
    if (t.type === "expense" && t.categoryId) {
      spent[t.categoryId] = (spent[t.categoryId] ?? 0) + t.amount
    }
  }

  const income  = categories.filter(c => c.type === "income")
  const expense = categories.filter(c => c.type === "expense" || !c.type)

  function CategoryList({ items, showBudget }: { items: Category[]; showBudget?: boolean }) {
    return (
      <ul style={{ margin: 0 }}>
        {items.map(c => {
          const catSpent = spent[c.id] ?? 0
          const hasBudget = showBudget && c.budget != null && c.budget > 0
          const pct = hasBudget ? Math.min(100, Math.round((catSpent / c.budget!) * 100)) : 0
          const over = hasBudget && catSpent > c.budget!

          return (
            <li key={c.id} className="row-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{
                  width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
                  backgroundColor: c.color ?? "var(--text-muted)", display: "inline-block",
                }} />
                <span className="row-primary" style={{ flex: 1, fontWeight: 500 }}>{c.name}</span>
                {hasBudget && (
                  <span className="num" style={{
                    fontSize: "12px",
                    color: over ? "var(--expense)" : "var(--text-secondary)",
                  }}>
                    ฿{catSpent.toLocaleString()} / ฿{c.budget!.toLocaleString()}
                  </span>
                )}
                <CategoryActions category={c} />
              </div>
              {hasBudget && (
                <div style={{ marginLeft: "20px", height: "4px", borderRadius: "2px", background: "var(--border)" }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    width: `${pct}%`,
                    background: over ? "var(--expense)" : (c.color ?? "var(--accent)"),
                    transition: "width var(--dur-slow) var(--ease-out)",
                  }} />
                </div>
              )}
            </li>
          )
        })}
        {items.length === 0 && (
          <li style={{ color: "var(--text-muted)", border: "none", padding: "12px 0" }}>None yet.</li>
        )}
      </ul>
    )
  }

  return (
    <main>
      <h1>Categories</h1>

      <div className="two-col-grid" style={{ marginBottom: "22px" }}>
        <section>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--expense)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Expense
          </h2>
          <CategoryList items={expense} showBudget />
        </section>
        <section>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--income)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Income
          </h2>
          <CategoryList items={income} />
        </section>
      </div>

      <h2>Add Category</h2>
      <AddCategoryForm />
    </main>
  )
}
