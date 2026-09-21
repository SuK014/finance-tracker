"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRecurring } from "@/lib/api"
import CategorySelect from "@/components/CategorySelect"

type Account = { id: number; name: string }
type Category = { id: number; name: string; type?: string }

export default function RecurringForm({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    description: "",
    accountId: accounts[0] ? String(accounts[0].id) : "",
    categoryId: "",
    frequency: "monthly",
    nextDate: today,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const result = await createRecurring({
        amount: Number(form.amount),
        type: form.type,
        description: form.description || undefined,
        accountId: Number(form.accountId),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        frequency: form.frequency,
        nextDate: form.nextDate,
      })
      if (result?.error) { setError(result.error); return }
      setForm({ type: "expense", amount: "", description: "", accountId: String(accounts[0]?.id ?? ""), categoryId: "", frequency: "monthly", nextDate: today })
      router.refresh()
    } catch {
      setError("Failed to save. Is the server running?")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}>
      <h3 style={{ margin: 0 }}>Add Recurring</h3>

      <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        {["expense", "income"].map(t => (
          <button key={t} type="button" onClick={() => setForm({ ...form, type: t, categoryId: "" })} style={{
            flex: 1, border: "none", borderRadius: 0, padding: "8px",
            background: form.type === t ? (t === "expense" ? "var(--expense)" : "var(--income)") : "transparent",
            color: form.type === t ? "#fff" : "var(--text-secondary)",
            borderLeft: t === "income" ? "1px solid var(--border)" : "none",
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <input
        type="number" step="any" min="0.01" required placeholder="Amount"
        value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
      />
      <input
        type="text" placeholder="Description (optional)"
        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
      />
      <select required value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}>
        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <CategorySelect
        categories={categories}
        type={form.type}
        value={form.categoryId}
        onChange={categoryId => setForm({ ...form, categoryId })}
      />
      <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      <div>
        <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Next date</label>
        <input type="date" required value={form.nextDate} onChange={e => setForm({ ...form, nextDate: e.target.value })} />
      </div>

      {error && <p style={{ color: "var(--expense)", fontSize: "13px", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Recurring"}</button>
    </form>
  )
}
