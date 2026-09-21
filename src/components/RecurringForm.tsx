"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRecurring } from "@/lib/api"
import CategorySelect from "@/components/CategorySelect"
import Select from "@/components/Select"
import DatePicker from "@/components/DatePicker"
import { currencySymbol } from "@/lib/currency"

type Account = { id: number; name: string; currency?: string }
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
  const selectedAccount = accounts.find(a => String(a.id) === form.accountId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.accountId) { setError("Please select an account."); return }
    if (!form.nextDate) { setError("Please select a next date."); return }
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

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span className="num" style={{ color: "var(--text-secondary)", fontSize: "14px", flexShrink: 0 }}>
          {currencySymbol(selectedAccount?.currency)}
        </span>
        <input
          type="number" step="any" min="0.01" required placeholder="Amount"
          value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
          style={{ flex: 1 }}
        />
      </div>
      <input
        type="text" placeholder="Description (optional)"
        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
      />
      <Select
        ariaLabel="Account"
        value={form.accountId}
        onChange={accountId => setForm({ ...form, accountId })}
        options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
      />
      <CategorySelect
        categories={categories}
        type={form.type}
        value={form.categoryId}
        onChange={categoryId => setForm({ ...form, categoryId })}
      />
      <Select
        ariaLabel="Frequency"
        value={form.frequency}
        onChange={frequency => setForm({ ...form, frequency })}
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ]}
      />
      <div>
        <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Next date</label>
        <DatePicker value={form.nextDate} onChange={nextDate => setForm({ ...form, nextDate })} />
      </div>

      {error && <p style={{ color: "var(--expense)", fontSize: "13px", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Recurring"}</button>
    </form>
  )
}
