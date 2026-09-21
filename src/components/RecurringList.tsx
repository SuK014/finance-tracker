"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { recordRecurring, deleteRecurring, updateRecurring } from "@/lib/api"
import RowActionsMenu from "@/components/RowActionsMenu"
import Select from "@/components/Select"
import DatePicker from "@/components/DatePicker"

type RecurringItem = {
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
  category?: { name: string; color?: string | null } | null
}

type Account = { id: number; name: string }
type Category = { id: number; name: string; type?: string }

export default function RecurringList({
  items,
  accounts,
  categories,
}: {
  items: RecurringItem[]
  accounts: Account[]
  categories: Category[]
}) {
  const router = useRouter()

  if (items.length === 0) {
    return <p style={{ color: "var(--text-secondary)" }}>No recurring transactions yet.</p>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map(item => (
        <RecurringRow
          key={item.id}
          item={item}
          accounts={accounts}
          categories={categories}
          onAction={() => router.refresh()}
        />
      ))}
    </div>
  )
}

function RecurringRow({
  item,
  accounts,
  categories,
  onAction,
}: {
  item: RecurringItem
  accounts: Account[]
  categories: Category[]
  onAction: () => void
}) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    amount: String(item.amount),
    type: item.type,
    description: item.description ?? "",
    accountId: String(item.accountId),
    categoryId: item.categoryId ? String(item.categoryId) : "",
    frequency: item.frequency,
    nextDate: new Date(item.nextDate).toISOString().slice(0, 10),
  })

  const nextDate = new Date(item.nextDate)
  const isPast = nextDate < new Date()
  const dateLabel = nextDate.toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })

  async function handleRecord() {
    setError(null)
    setRecording(true)
    try {
      const res = await recordRecurring(item.id)
      if (res?.error) { setError(res.error); return }
      onAction()
    } catch {
      setError("Failed to record.")
    } finally {
      setRecording(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this recurring transaction?")) return
    await deleteRecurring(item.id)
    onAction()
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.amount || Number(form.amount) <= 0) { setError("Please enter an amount."); return }
    if (!form.nextDate) { setError("Please select a next date."); return }
    setSaving(true)
    try {
      const res = await updateRecurring(item.id, {
        amount: Number(form.amount),
        type: form.type,
        description: form.description || undefined,
        accountId: Number(form.accountId),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        frequency: form.frequency,
        nextDate: form.nextDate,
      })
      if (res?.error) { setError(res.error); return }
      setEditing(false)
      onAction()
    } catch {
      setError("Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    const filteredCats = categories.filter(c => !c.type || c.type === form.type)
    return (
      <form onSubmit={handleSave} style={{
        display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center",
        padding: "12px", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        background: "var(--surface)",
      }}>
        <div style={{ width: "110px" }}>
          <Select
            ariaLabel="Transaction type"
            value={form.type}
            onChange={type => setForm({ ...form, type, categoryId: "" })}
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />
        </div>
        <input type="number" step="any" min="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ width: "80px" }} />
        <input type="text" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: "130px" }} />
        <div style={{ width: "130px" }}>
          <Select
            ariaLabel="Account"
            value={form.accountId}
            onChange={accountId => setForm({ ...form, accountId })}
            options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
          />
        </div>
        <div style={{ width: "150px" }}>
          <Select
            ariaLabel="Category"
            value={form.categoryId}
            onChange={categoryId => setForm({ ...form, categoryId })}
            options={[{ value: "", label: "No category" }, ...filteredCats.map(c => ({ value: String(c.id), label: c.name }))]}
          />
        </div>
        <div style={{ width: "130px" }}>
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
        </div>
        <div style={{ width: "150px" }}>
          <DatePicker value={form.nextDate} onChange={nextDate => setForm({ ...form, nextDate })} />
        </div>
        {error && <span style={{ color: "var(--expense)", fontSize: "12px" }}>{error}</span>}
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => { setEditing(false); setError(null) }}>Cancel</button>
      </form>
    )
  }

  return (
    <div className="row-card">
      <span className="row-primary">
        {item.description || item.category?.name || item.account.name}
      </span>

      <span className="row-amount num" style={{
        color: item.type === "expense" ? "var(--expense)" : "var(--income)",
        fontWeight: 600,
      }}>
        {item.type === "income" ? "+" : "-"}฿{item.amount.toLocaleString()}
      </span>

      <span className="row-meta">
        {item.category && (
          <span style={{
            padding: "1px 7px", borderRadius: "999px",
            fontSize: "11px", background: item.category.color ?? "var(--text-muted)", color: "#fff",
          }}>{item.category.name}</span>
        )}
        <span style={{ textTransform: "capitalize" }}>{item.frequency}</span>
        <span className="num" style={{
          color: isPast ? "var(--expense)" : "var(--text-secondary)",
          fontWeight: isPast ? 600 : 400,
        }}>
          {isPast ? "Due: " : "Next: "}{dateLabel}
        </span>
        <span>{item.account.name}</span>
        {error && <span style={{ color: "var(--expense)" }}>{error}</span>}
      </span>

      <span className="row-actions-inline" style={{ marginLeft: "auto" }}>
        <button type="button" onClick={handleRecord} disabled={recording} style={{
          background: "var(--income)", color: "#fff", border: "none",
          borderRadius: "var(--radius)", padding: "4px 10px", fontSize: "12px",
        }}>
          {recording ? "…" : "Record"}
        </button>
        <button type="button" onClick={() => setEditing(true)}>Edit</button>
        <button type="button" onClick={handleDelete} style={{
          background: "var(--expense)", color: "#fff", border: "none",
          borderRadius: "var(--radius)", padding: "4px 10px", fontSize: "12px",
        }}>Del</button>
      </span>
      <span className="row-actions-menu">
        <button type="button" onClick={handleRecord} disabled={recording} style={{
          background: "var(--income)", color: "#fff", border: "none",
          borderRadius: "var(--radius)", padding: "4px 10px", fontSize: "12px",
        }}>
          {recording ? "…" : "Record"}
        </button>
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
