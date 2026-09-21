"use client"

import { useState, useRef } from "react"
import { createTransaction, uploadEvidence } from "@/lib/api"
import { useRouter } from "next/navigation"

type Category = { id: number; name: string; color?: string; type?: string }

export default function AddTransactionForm({
  accounts,
  categories,
  defaultAccountId,
}: {
  accounts: any[]
  categories: Category[]
  defaultAccountId?: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    date: "",
    time: "",
    description: "",
    accountId: defaultAccountId ?? "",
    categoryId: "",
  })
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const transaction = await createTransaction({
        amount: Number(form.amount),
        type: form.type,
        date: form.time ? `${form.date}T${form.time}` : form.date,
        description: form.description,
        accountId: Number(form.accountId),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      })
      if (transaction?.error) { setError(transaction.error); return }
      if (evidenceFile && transaction?.id) {
        await uploadEvidence(transaction.id, evidenceFile)
      }
      router.push("/transactions")
    } catch {
      setError("Failed to save transaction. Is the server running?")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <select
        value={form.accountId}
        onChange={e => setForm({ ...form, accountId: e.target.value })}
        required
      >
        <option value="">Select account</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <select
        value={form.type}
        onChange={e => setForm({ ...form, type: e.target.value, categoryId: "" })}
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>

      <select
        value={form.categoryId}
        onChange={e => setForm({ ...form, categoryId: e.target.value })}
      >
        <option value="">No category</option>
        {categories.filter(c => c.type === form.type).map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <input
        type="number" placeholder="Amount" min="0.01" step="any" required
        value={form.amount}
        onChange={e => setForm({ ...form, amount: e.target.value })}
      />
      <input
        type="date" required
        value={form.date}
        onChange={e => setForm({ ...form, date: e.target.value })}
      />
      <input
        type="time"
        value={form.time}
        onChange={e => setForm({ ...form, time: e.target.value })}
      />
      <input
        type="text" placeholder="Description"
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />

      <div>
        <input
          ref={fileRef} type="file" accept="image/*"
          style={{ display: "none" }}
          onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" onClick={() => fileRef.current?.click()} style={{ width: "100%" }}>
          {evidenceFile ? `📎 ${evidenceFile.name}` : "Attach evidence image (optional)"}
        </button>
        {evidenceFile && (
          <img
            src={URL.createObjectURL(evidenceFile)}
            alt="preview"
            style={{ marginTop: "8px", maxHeight: "120px", borderRadius: "6px", objectFit: "cover" }}
          />
        )}
      </div>

      {error && <p style={{ color: "var(--expense)", fontSize: "13px", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Add Transaction"}
      </button>
    </form>
  )
}
