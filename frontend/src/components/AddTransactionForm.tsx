"use client"

import { useState, useRef } from "react"
import { createTransaction, uploadEvidence } from "@/lib/api"
import { useRouter } from "next/navigation"
import CategorySelect from "@/components/CategorySelect"
import Select from "@/components/Select"
import DatePicker from "@/components/DatePicker"
import TimePicker from "@/components/TimePicker"
import { currencySymbol } from "@/lib/currency"

type Category = { id: number; name: string; color?: string; type?: string }

function now() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

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
  const [form, setForm] = useState(() => ({
    amount: "",
    type: "expense",
    ...now(),
    description: "",
    accountId: defaultAccountId ?? "",
    categoryId: "",
  }))
  const selectedAccount = accounts.find(a => String(a.id) === form.accountId)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!form.accountId) { setError("Please select an account."); return }
    if (!form.date) { setError("Please select a date."); return }
    if (!form.amount || Number(form.amount) <= 0) { setError("Please enter an amount."); return }
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
      <Select
        ariaLabel="Account"
        value={form.accountId}
        onChange={accountId => setForm({ ...form, accountId })}
        placeholder="Select account"
        options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
      />

      <Select
        ariaLabel="Transaction type"
        value={form.type}
        onChange={type => setForm({ ...form, type, categoryId: "" })}
        options={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
        ]}
      />

      <CategorySelect
        categories={categories}
        type={form.type}
        value={form.categoryId}
        onChange={categoryId => setForm({ ...form, categoryId })}
      />

      <div>
        <label htmlFor="txn-amount" className="field-label">Amount</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="num" style={{ color: "var(--text-secondary)", fontSize: "14px", flexShrink: 0 }}>
            {currencySymbol(selectedAccount?.currency)}
          </span>
          <input
            id="txn-amount"
            type="number" placeholder="0.00" min="0.01" step="any" required
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            style={{ flex: 1 }}
          />
        </div>
      </div>
      <DatePicker
        value={form.date}
        onChange={date => setForm({ ...form, date })}
      />
      <TimePicker
        value={form.time}
        onChange={time => setForm({ ...form, time })}
      />
      <div>
        <label htmlFor="txn-description" className="field-label">Description</label>
        <input
          id="txn-description"
          type="text" placeholder="e.g. Groceries at Big C"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </div>

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
