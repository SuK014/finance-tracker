"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sellAsset } from "@/lib/api"

export default function SellAssetButton({
  symbol,
  maxShares,
}: {
  symbol: string
  maxShares: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ quantity: "", price: "" })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const qty = Number(form.quantity)
    const price = Number(form.price)
    if (qty <= 0 || qty > maxShares || price <= 0) return
    setSubmitting(true)
    await sellAsset({ symbol, quantity: qty, price })
    setForm({ quantity: "", price: "" })
    setOpen(false)
    setSubmitting(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        Sell
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
      <input
        type="number" step="any" min="0.000001" required
        placeholder={`Qty (max ${maxShares.toFixed(6)})`}
        value={form.quantity}
        onChange={e => setForm({ ...form, quantity: e.target.value })}
        style={{ width: "130px" }}
      />
      <input
        type="number" step="any" min="0.000001" required
        placeholder="Sell price (USD)"
        value={form.price}
        onChange={e => setForm({ ...form, price: e.target.value })}
        style={{ width: "120px" }}
      />
      <button type="submit" disabled={submitting}>{submitting ? "..." : "Confirm"}</button>
      <button type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  )
}
