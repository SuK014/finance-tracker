"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRecurring } from "@/lib/api"
import CategorySelect from "@/components/CategorySelect"
import Select from "@/components/Select"
import DatePicker from "@/components/DatePicker"
import ServicePicker from "@/components/ServicePicker"
import { currencySymbol } from "@/lib/currency"

type Account = { id: number; name: string; currency?: string }
type Category = { id: number; name: string; type?: string }

export default function SubscriptionForm({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const blank = {
    amount: "",
    description: "",
    accountId: accounts[0] ? String(accounts[0].id) : "",
    categoryId: "",
    frequency: "monthly",
    nextDate: today,
  }
  const [form, setForm] = useState(blank)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const selectedAccount = accounts.find(a => String(a.id) === form.accountId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.description.trim()) { setError("Pick a service or type a name."); return }
    if (!form.accountId) { setError("Please select an account."); return }
    if (!form.nextDate) { setError("Please select the next renewal date."); return }
    setSaving(true)
    try {
      const result = await createRecurring({
        amount: Number(form.amount),
        type: "expense",
        description: form.description.trim(),
        accountId: Number(form.accountId),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        frequency: form.frequency,
        nextDate: form.nextDate,
      })
      if (result?.error) { setError(result.error); return }
      setForm({ ...blank, accountId: String(accounts[0]?.id ?? "") })
      router.refresh()
    } catch {
      setError("Couldn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "520px" }}>
      <h2 style={{ margin: 0 }}>Add subscription</h2>

      <div>
        <span className="field-label">Service</span>
        <ServicePicker description={form.description} onPick={description => setForm({ ...form, description })} />
        <input
          type="text"
          aria-label="Subscription name"
          placeholder="Or type a name, e.g. Gym"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          style={{ width: "100%", marginTop: "10px" }}
        />
      </div>

      <div>
        <label htmlFor="sub-amount" className="field-label">Price</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="num" style={{ color: "var(--text-secondary)", fontSize: "16px", flexShrink: 0 }}>
            {currencySymbol(selectedAccount?.currency)}
          </span>
          <input
            id="sub-amount"
            type="number" step="any" min="0.01" required placeholder="0.00"
            value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <div>
        <span className="field-label">Billed</span>
        <div className="seg" role="group" aria-label="Billing period">
          {[{ v: "monthly", l: "Monthly" }, { v: "yearly", l: "Yearly" }].map(o => (
            <button key={o.v} type="button" aria-pressed={form.frequency === o.v} onClick={() => setForm({ ...form, frequency: o.v })}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Next renewal</span>
        <DatePicker value={form.nextDate} onChange={nextDate => setForm({ ...form, nextDate })} />
      </div>

      <div>
        <span className="field-label">Paid from</span>
        <Select
          ariaLabel="Account"
          value={form.accountId}
          onChange={accountId => setForm({ ...form, accountId })}
          options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
        />
      </div>

      <div>
        <span className="field-label">Category</span>
        <CategorySelect
          categories={categories}
          type="expense"
          value={form.categoryId}
          onChange={categoryId => setForm({ ...form, categoryId })}
        />
      </div>

      {error && <p role="alert" style={{ color: "var(--expense)", fontSize: "14px", margin: 0, fontWeight: 500 }}>{error}</p>}
      <button type="submit" disabled={saving} style={{ minHeight: "48px" }}>{saving ? "Saving…" : "Add subscription"}</button>
    </form>
  )
}
