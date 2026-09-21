"use client"

import { useState } from "react"
import { createAccount } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function AddAccountForm() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", type: "bank", bankName: "" })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await createAccount({ name: form.name, type: form.type, bankName: form.bankName })
      if (result?.error) { setError(result.error); return }
      setForm({ name: "", type: "bank", bankName: "" })
      router.refresh()
    } catch {
      setError("Failed to create account. Is the server running?")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <input
        type="text" placeholder="Account name" required
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
      />
      <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
        <option value="bank">Bank</option>
        <option value="wallet">Wallet</option>
        <option value="credit_card">Credit Card</option>
      </select>
      <input
        type="text" placeholder="Bank name (optional)"
        value={form.bankName}
        onChange={e => setForm({ ...form, bankName: e.target.value })}
      />
      {error && <p style={{ color: "var(--expense)", fontSize: "13px", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Account"}</button>
    </form>
  )
}
