"use client"

import { useState } from "react"
import { getAssetPrice, createAsset } from "@/lib/api"
import { useRouter } from "next/navigation"

const ASSET_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "etf",   label: "ETF" },
  { value: "crypto", label: "Crypto" },
]

type PriceData = {
  symbol: string
  name: string
  price: number
  currency: string
  usdthb: number
}

export default function AddAssetForm() {
  const router = useRouter()

  const [assetType, setAssetType] = useState("")
  const [symbolInput, setSymbolInput] = useState("")
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [lookupError, setLookupError] = useState("")
  const [looking, setLooking] = useState(false)

  const [currency, setCurrency] = useState<"THB" | "USD">("THB")
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const amountNum = Number(amount)
  const amountInUsd = priceData
    ? currency === "USD" ? amountNum : amountNum / priceData.usdthb
    : 0
  const shares = priceData && amountInUsd > 0 ? amountInUsd / priceData.price : 0
  const priceInThb = priceData ? priceData.price * priceData.usdthb : 0

  async function handleLookup() {
    if (!symbolInput.trim()) return
    setLooking(true)
    setLookupError("")
    setPriceData(null)
    try {
      let sym = symbolInput.trim().toUpperCase()
      if (assetType === "crypto" && !sym.includes("-")) sym = `${sym}-USD`
      const data = await getAssetPrice(sym)
      setPriceData(data)
    } catch {
      setLookupError("Symbol not found. Check and try again.")
    } finally {
      setLooking(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!priceData || shares <= 0) return
    setSubmitting(true)
    await createAsset({
      symbol: priceData.symbol,
      name: priceData.name,
      type: assetType,
      quantity: shares,
      price: priceData.price,
    })
    setAssetType("")
    setSymbolInput("")
    setPriceData(null)
    setAmount("")
    setSubmitting(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">

      {/* Step 1: Asset type */}
      <div className="flex gap-2">
        {ASSET_TYPES.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setAssetType(t.value); setPriceData(null); setSymbolInput(""); setLookupError("") }}
            style={{ fontWeight: assetType === t.value ? "bold" : "normal" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Step 2: Symbol lookup */}
      {assetType && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={assetType === "crypto" ? "Symbol (e.g. BTC)" : "Symbol (e.g. AAPL)"}
            value={symbolInput}
            onChange={e => { setSymbolInput(e.target.value); setPriceData(null) }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleLookup() } }}
          />
          <button type="button" onClick={handleLookup} disabled={looking}>
            {looking ? "..." : "Look up"}
          </button>
        </div>
      )}

      {lookupError && <p style={{ color: "red" }}>{lookupError}</p>}

      {/* Step 3: Price info + amount */}
      {priceData && (
        <>
          <div>
            <p><strong>{priceData.name}</strong> ({priceData.symbol})</p>
            <p>Current price: ${priceData.price.toFixed(2)} · ฿{priceInThb.toFixed(2)}</p>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setCurrency("THB")} style={{ fontWeight: currency === "THB" ? "bold" : "normal" }}>THB</button>
            <button type="button" onClick={() => setCurrency("USD")} style={{ fontWeight: currency === "USD" ? "bold" : "normal" }}>USD</button>
          </div>

          <input
            type="number"
            step="any"
            min="0.000001"
            placeholder={`Amount in ${currency}`}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />

          {shares > 0 && (
            <p>You will get <strong>{shares.toFixed(6)} shares</strong></p>
          )}

          <button type="submit" disabled={submitting || shares <= 0}>
            {submitting ? "Adding..." : "Add to Portfolio"}
          </button>
        </>
      )}

    </form>
  )
}
