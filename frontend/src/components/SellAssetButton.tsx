"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { sellAsset, getAssetPrice } from "@/lib/api"
import InvestAccountSelect, { type InvestAccount } from "@/components/InvestAccountSelect"

export default function SellAssetButton({
  symbol,
  maxShares,
  accounts = [],
  currency = "USD",
}: {
  symbol: string
  maxShares: number
  accounts?: InvestAccount[]
  currency?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ quantity: "", price: "" })
  const [submitting, setSubmitting] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [usdthb, setUsdthb] = useState<number | null>(null)
  const [error, setError] = useState("")

  // Opening the form looks up today's price (to prefill it and to preview the cash)
  // and restores the last-used account.
  async function openForm() {
    setOpen(true)
    setError("")
    try {
      const last = localStorage.getItem("investAccountId") ?? ""
      if (accounts.some(a => String(a.id) === last)) setAccountId(last)
    } catch {}
    try {
      const q = await getAssetPrice(symbol)
      setUsdthb(q.usdthb)
      setForm(f => (f.price ? f : { ...f, price: String(q.price) }))
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const qty = Number(form.quantity)
    const price = Number(form.price)
    if (qty <= 0 || qty > maxShares || price <= 0) {
      setError(qty > maxShares ? `You only hold ${maxShares.toFixed(6)} shares.` : "Enter a quantity and price above 0.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await sellAsset({ symbol, quantity: qty, price, ...(accountId ? { accountId: Number(accountId) } : {}) })
      if (res?.error) { setError(res.error); return }
      try { localStorage.setItem("investAccountId", accountId) } catch {}
      setForm({ quantity: "", price: "" })
      setOpen(false)
      router.refresh()
    } catch {
      setError("Couldn't sell. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={openForm}>
        Sell
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-start", minWidth: "260px" }}>
      <input
        type="number" step="any" min="0.000001" required
        aria-label="Quantity to sell"
        placeholder={`Qty (max ${maxShares.toFixed(6)})`}
        value={form.quantity}
        onChange={e => setForm({ ...form, quantity: e.target.value })}
        style={{ width: "130px" }}
      />
      <input
        type="number" step="any" min="0.000001" required
        aria-label="Sell price"
        placeholder="Sell price (USD)"
        value={form.price}
        onChange={e => setForm({ ...form, price: e.target.value })}
        style={{ width: "120px" }}
      />
      {accounts.length > 0 && (
        <div style={{ flexBasis: "100%" }}>
          <InvestAccountSelect
            mode="sell"
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            assetCurrency={currency}
            assetAmount={Number(form.quantity) * Number(form.price)}
            usdthb={usdthb}
          />
        </div>
      )}
      {error && <p role="alert" style={{ color: "var(--expense)", margin: 0, flexBasis: "100%" }}>{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? "..." : "Confirm"}</button>
      <button type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  )
}
