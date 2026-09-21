"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { updateTransaction, uploadEvidence, deleteTransaction } from "@/lib/api"
import DeleteButton from "@/components/DeleteButton"
import RowActionsMenu from "@/components/RowActionsMenu"

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
        <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} required>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, categoryId: "" })}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">No category</option>
          {categories.filter(c => c.type === form.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="number" step="any" min="0.01" required
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          style={{ width: "80px" }}
        />
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
        <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
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
