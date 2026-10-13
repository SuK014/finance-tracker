"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { updateTransaction, uploadEvidence, deleteTransaction } from "@/lib/api"
import DeleteButton from "@/components/DeleteButton"
import RowActionsMenu from "@/components/RowActionsMenu"
import CategorySelect from "@/components/CategorySelect"
import Select from "@/components/Select"
import DatePicker from "@/components/DatePicker"
import TimePicker from "@/components/TimePicker"

const API_URL = process.env.NEXT_PUBLIC_API_URL

type Transaction = {
  id: number
  amount: number
  type: string
  date: string
  description?: string | null
  accountId: number
  categoryId?: number | null
  evidenceUrl?: string | null
}

type Account = { id: number; name: string }
type Category = { id: number; name: string; type?: string }

export default function TransactionActions({
  transaction,
  accounts,
  categories,
}: {
  transaction: Transaction
  accounts: Account[]
  categories: Category[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [showImage, setShowImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isoDate = new Date(transaction.date)
  const [form, setForm] = useState({
    amount: String(transaction.amount),
    type: transaction.type,
    date: isoDate.toISOString().slice(0, 10),
    time: isoDate.toISOString().slice(11, 16),
    description: transaction.description ?? "",
    accountId: String(transaction.accountId),
    categoryId: transaction.categoryId ? String(transaction.categoryId) : "",
  })

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.accountId) { setError("Please select an account."); return }
    if (!form.date) { setError("Please select a date."); return }
    if (!form.amount || Number(form.amount) <= 0) { setError("Please enter an amount."); return }
    setSaving(true)
    try {
      const result = await updateTransaction(transaction.id, {
        amount: Number(form.amount),
        type: form.type,
        date: form.time ? `${form.date}T${form.time}` : form.date,
        description: form.description,
        accountId: Number(form.accountId),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      })
      if (result?.error) { setError(result.error); return }
      if (evidenceFile) {
        await uploadEvidence(transaction.id, evidenceFile)
      }
      setEditing(false)
      setEvidenceFile(null)
      router.refresh()
    } catch {
      setError("Failed to save. Is the server running?")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleEdit} style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ width: "130px" }}>
          <Select
            ariaLabel="Account"
            value={form.accountId}
            onChange={accountId => setForm({ ...form, accountId })}
            options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
          />
        </div>
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
        <div style={{ width: "150px" }}>
          <CategorySelect
            categories={categories}
            type={form.type}
            value={form.categoryId}
            onChange={categoryId => setForm({ ...form, categoryId })}
          />
        </div>
        <input
          type="number" step="any" min="0.01" required
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          style={{ width: "80px" }}
        />
        <div style={{ width: "130px" }}>
          <DatePicker value={form.date} onChange={date => setForm({ ...form, date })} />
        </div>
        <div style={{ width: "110px" }}>
          <TimePicker value={form.time} onChange={time => setForm({ ...form, time })} />
        </div>
        <input
          type="text" placeholder="Description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" onClick={() => fileRef.current?.click()}>
          {evidenceFile ? `📎 ${evidenceFile.name}` : transaction.evidenceUrl ? "Replace image" : "Add image"}
        </button>
        {error && <span style={{ color: "var(--expense)", fontSize: "12px" }}>{error}</span>}
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => { setEditing(false); setEvidenceFile(null); setError(null) }}>Cancel</button>
      </form>
    )
  }

  async function handleMenuDelete() {
    if (!confirm("Delete this transaction?")) return
    await deleteTransaction(transaction.id)
    router.refresh()
  }

  return (
    <>
      <span className="row-actions-inline">
        {transaction.evidenceUrl && (
          <button type="button" onClick={() => setShowImage(v => !v)} title="View evidence">
            📎
          </button>
        )}
        <button type="button" onClick={() => setEditing(true)}>Edit</button>
        <DeleteButton id={transaction.id} type="transaction" />
      </span>
      <span className="row-actions-menu">
        <RowActionsMenu
          actions={[
            ...(transaction.evidenceUrl ? [{ label: "View evidence", onClick: () => setShowImage(true) }] : []),
            { label: "Edit", onClick: () => setEditing(true) },
            { label: "Delete", onClick: handleMenuDelete, danger: true },
          ]}
        />
      </span>
      {showImage && (
        <div
          onClick={() => setShowImage(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
        >
          <img
            src={`${API_URL}${transaction.evidenceUrl}`}
            alt="evidence"
            style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: "8px" }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
