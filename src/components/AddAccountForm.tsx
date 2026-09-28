"use client"

import { useState } from "react"
import { createAccount } from "@/lib/api"
import { useRouter } from "next/navigation"
import { CURRENCIES } from "@/lib/currency"
import Select from "@/components/Select"

export default function AddAccountForm() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", type: "bank", bankName: "", currency: "THB" })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await createAccount({ name: form.name, type: form.type, bankName: form.bankName, currency: form.currency })
      if (result?.error) { setError(result.error); return }
      setForm({ name: "", type: "bank", bankName: "", currency: "THB" })
      router.refresh()
    } catch {
      setError("Failed to create account. Is the server running?")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <div>
        <label htmlFor="account-name" className="field-label">Account name</label>
        <input
          id="account-name"
          type="text" placeholder="e.g. SCB Savings" required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <Select
        ariaLabel="Account type"
        value={form.type}
        onChange={type => setForm({ ...form, type })}
        options={[
          { value: "bank", label: "Bank" },
          { value: "wallet", label: "Wallet" },
          { value: "credit_card", label: "Credit Card" },
        ]}
      />
      <Select
        ariaLabel="Currency"
        value={form.currency}
        onChange={currency => setForm({ ...form, currency })}
        options={CURRENCIES.map(c => ({ value: c.code, label: `${c.symbol} ${c.label}` }))}
      />
      <div>
        <label htmlFor="account-bank-name" className="field-label">Bank name (optional)</label>
        <input
          id="account-bank-name"
          type="text" placeholder="e.g. Siam Commercial Bank"
          value={form.bankName}
          onChange={e => setForm({ ...form, bankName: e.target.value })}
        />
      </div>
      {error && <p style={{ color: "var(--expense)", fontSize: "13px", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Account"}</button>
    </form>
  )
}
