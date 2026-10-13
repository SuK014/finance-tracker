"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { recordRecurring, deleteRecurring, updateRecurring } from "@/lib/api"
import RowActionsMenu from "@/components/RowActionsMenu"
import Select from "@/components/Select"
import DatePicker from "@/components/DatePicker"
import SubscriptionIcon from "@/components/ServiceIcon"
import ServicePicker from "@/components/ServicePicker"

type Item = {
  id: number
  amount: number
  type: string
  description?: string | null
  frequency: string
  nextDate: string
  active: boolean
  accountId: number
  categoryId?: number | null
  account: { name: string }
  category?: { name: string; color?: string | null; icon?: string | null; type?: string | null } | null
}

type Account = { id: number; name: string }
type Category = { id: number; name: string; type?: string }

const FREQ_LABEL: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" }

export default function SubscriptionList({
  items,
  accounts,
  categories,
}: {
  items: Item[]
  accounts: Account[]
  categories: Category[]
}) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="card empty-state">
        <span className="big" aria-hidden="true">📺</span>
        No subscriptions yet. Add Netflix, Spotify or anything else that renews, and it will show up here with a reminder.
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {items.map(item => (
        <SubscriptionRow key={item.id} item={item} accounts={accounts} categories={categories} onAction={() => router.refresh()} />
      ))}
    </div>
  )
}

function SubscriptionRow({
  item,
  accounts,
  categories,
  onAction,
}: {
  item: Item
  accounts: Account[]
  categories: Category[]
  onAction: () => void
}) {
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    amount: String(item.amount),
    description: item.description ?? "",
    accountId: String(item.accountId),
    categoryId: item.categoryId ? String(item.categoryId) : "",
    frequency: item.frequency,
    nextDate: new Date(item.nextDate).toISOString().slice(0, 10),
  })

  const nextDate = new Date(item.nextDate)
  const isPast = nextDate < new Date()
  const dateLabel = nextDate.toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })
  const title = item.description || item.category?.name || item.account.name

  async function handlePaid() {
    setError(null)
    setPaying(true)
    try {
      const res = await recordRecurring(item.id)
      if (res?.error) { setError(res.error); return }
      onAction()
    } catch {
      setError("Couldn't record the payment.")
    } finally {
      setPaying(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${title}?`)) return
    await deleteRecurring(item.id)
    onAction()
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.amount || Number(form.amount) <= 0) { setError("Please enter a price."); return }
    if (!form.nextDate) { setError("Please select the next renewal date."); return }
    setSaving(true)
    try {
      const res = await updateRecurring(item.id, {
        amount: Number(form.amount),
        type: item.type,
        description: form.description.trim() || undefined,
        accountId: Number(form.accountId),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        frequency: form.frequency,
        nextDate: form.nextDate,
      })
      if (res?.error) { setError(res.error); return }
      setEditing(false)
      onAction()
    } catch {
      setError("Couldn't save.")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    const filteredCats = categories.filter(c => !c.type || c.type === item.type)
    const freqOptions = [
      { value: "monthly", label: "Monthly" },
      { value: "yearly", label: "Yearly" },
      // Keep an older daily/weekly entry editable without silently changing it.
      ...(item.frequency !== "monthly" && item.frequency !== "yearly"
        ? [{ value: item.frequency, label: FREQ_LABEL[item.frequency] ?? item.frequency }]
        : []),
    ]
    return (
      <form onSubmit={handleSave} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <ServicePicker description={form.description} onPick={description => setForm({ ...form, description })} />
        <input type="text" aria-label="Subscription name" placeholder="Name" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <input type="number" aria-label="Price" step="any" min="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        <Select ariaLabel="Billing period" value={form.frequency} onChange={frequency => setForm({ ...form, frequency })} options={freqOptions} />
        <DatePicker value={form.nextDate} onChange={nextDate => setForm({ ...form, nextDate })} />
        <Select
          ariaLabel="Account"
          value={form.accountId}
          onChange={accountId => setForm({ ...form, accountId })}
          options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
        />
        <Select
          ariaLabel="Category"
          value={form.categoryId}
          onChange={categoryId => setForm({ ...form, categoryId })}
          options={[{ value: "", label: "No category" }, ...filteredCats.map(c => ({ value: String(c.id), label: c.name }))]}
        />
        {error && <span role="alert" style={{ color: "var(--expense)", fontSize: "13px" }}>{error}</span>}
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => { setEditing(false); setError(null) }}>Cancel</button>
        </div>
      </form>
    )
  }

  return (
    <div className="sub-card">
      <SubscriptionIcon description={item.description} category={item.category} />
      <div className="sub-main">
        <div className="sub-top">
          <div className="tx-title">{title}</div>
          <span className="tx-amount num" style={{ color: item.type === "expense" ? "var(--expense)" : "var(--income)" }}>
            {item.type === "income" ? "+" : "-"}฿{item.amount.toLocaleString()}
          </span>
        </div>
        <div className="tx-sub">
          {FREQ_LABEL[item.frequency] ?? item.frequency}
          {" · "}
          <span style={{ color: isPast ? "var(--expense)" : undefined, fontWeight: isPast ? 700 : undefined }}>
            {isPast ? "Due " : "Renews "}{dateLabel}
          </span>
          <span className="sub-account">{" · "}{item.account.name}</span>
        </div>
        {error && <div role="alert" style={{ color: "var(--expense)", fontSize: "13px" }}>{error}</div>}
      </div>

      <span className="row-actions-inline">
        <button type="button" className="btn-paid" onClick={handlePaid} disabled={paying}>{paying ? "…" : "Mark paid"}</button>
        <button type="button" onClick={() => setEditing(true)}>Edit</button>
        <button type="button" onClick={handleDelete}>Delete</button>
      </span>
      <span className="row-actions-menu">
        <button type="button" className="btn-paid" onClick={handlePaid} disabled={paying}>{paying ? "…" : "Paid"}</button>
        <RowActionsMenu
          actions={[
            { label: "Edit", onClick: () => setEditing(true) },
            { label: "Delete", onClick: handleDelete, danger: true },
          ]}
        />
      </span>
    </div>
  )
}
