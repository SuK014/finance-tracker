"use client"

import { useEffect, useState } from "react"
import { confirmSlip, getSlipImageUrl, rejectSlip, type InboxSlip } from "@/lib/api"
import { currencySymbol } from "@/lib/currency"
import { thaiClock } from "@/lib/thaiTime"
import BottomSheet from "@/components/BottomSheet"
import CategoryIcon from "@/components/CategoryIcon"
import DatePicker from "@/components/DatePicker"
import Select from "@/components/Select"
import TimePicker from "@/components/TimePicker"

type Account = { id: number; name: string; currency?: string }
type Category = { id: number; name: string; color?: string | null; icon?: string | null; type?: string }

// Remembered per device, like the Add transaction sheet's own last account.
const LAST_ACCOUNT_KEY = "lastSlipAccountId"

// The account matching the bank the Shortcut sent, else the one you last confirmed a slip into, else the first.
function startingAccount(accounts: Account[], suggested: number | null): string {
  const hinted = accounts.find(a => a.id === suggested)
  if (hinted) return String(hinted.id)
  let last: string | null = null
  try { last = localStorage.getItem(LAST_ACCOUNT_KEY) } catch {}
  const found = accounts.find(a => String(a.id) === last) ?? accounts[0]
  return found ? String(found.id) : ""
}

function clock12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

// One slip to check. Mounted with key={slip.id}, so every slip starts from what was read off it.
export default function SlipForm({
  slip,
  accounts,
  categories,
  onDone,
}: {
  slip: InboxSlip
  accounts: Account[]
  categories: Category[]
  onDone: (kind: "confirmed" | "rejected") => void
}) {
  const [type, setType] = useState<"income" | "expense">(slip.type ?? "expense")
  const [amount, setAmount] = useState(slip.amount != null ? String(slip.amount) : "")
  const [description, setDescription] = useState(slip.description ?? "")
  const [date, setDate] = useState(slip.day ?? thaiClock().toISOString().slice(0, 10))
  const [time, setTime] = useState(slip.time ?? "")
  const [accountId, setAccountId] = useState(() => startingAccount(accounts, slip.suggestedAccountId))
  const [categoryId, setCategoryId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (!slip.hasImage) return
    let alive = true
    let url: string | null = null
    getSlipImageUrl(slip.id)
      .then(u => {
        if (!alive) { if (u) URL.revokeObjectURL(u); return }
        url = u
        setImageUrl(u)
      })
      .catch(() => {})
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [slip.id, slip.hasImage])

  const account = accounts.find(a => String(a.id) === accountId)
  const shown = categories.filter(c => !c.type || c.type === type)
  const reading = slip.parsedBy === null
  const unreadable = !reading && slip.amount == null
  const typed = Number(amount.replace(/,/g, ""))
  const hasAmount = Number.isFinite(typed) && typed > 0

  // Where the time came from, only while it is still what was read; once you change it the note goes away.
  let timeNote: { text: string; missing: boolean } | null = null
  if (!time) timeNote = { text: "No time found. Add it below.", missing: true }
  else if (time === slip.time && slip.timeSource === "slip") timeNote = { text: "Time read from the slip", missing: false }
  else if (time === slip.time && slip.timeSource === "screenshot") timeNote = { text: "Time taken from when the screenshot was taken", missing: false }

  async function confirm() {
    setError(null)
    if (!Number.isFinite(typed) || typed <= 0) { setError("Enter the amount."); return }
    if (!time) { setError("Add the time of the payment."); return }
    if (!account) { setError("Choose an account."); return }
    setBusy(true)
    try {
      const res = await confirmSlip(slip.id, {
        amount: typed, type, date, time, accountId: account.id,
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      })
      if (res.error) { setError(res.error); return }
      try { localStorage.setItem(LAST_ACCOUNT_KEY, accountId) } catch {}
      onDone("confirmed")
    } catch {
      setError("Couldn't save. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    setError(null)
    setBusy(true)
    try {
      const res = await rejectSlip(slip.id)
      if (res.error) { setError(res.error); return }
      onDone("rejected")
    } catch {
      setError("Couldn't reject. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="slip-form" onSubmit={e => { e.preventDefault(); confirm() }} noValidate>
      {/* In the review pop-up only these fields scroll; the Confirm / Reject bar below them stays put */}
      <div className="slip-fields">
      <section className="slip-summary" aria-label="Slip summary">
        {slip.hasImage && (
          <button type="button" className="slip-thumb" onClick={() => setZoomed(true)} aria-label="View screenshot" disabled={!imageUrl}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imageUrl && <img src={imageUrl} alt="" />}
          </button>
        )}
        <div className="slip-summary-text">
          <div className="slip-amount num" data-type={hasAmount ? type : "none"}>
            {hasAmount
              ? `${type === "expense" ? "−" : "+"}${currencySymbol(account?.currency)}${typed.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
              : "No amount yet"}
          </div>
          <div className="slip-when">{dayLabel(date)}{time ? `, ${clock12(time)}` : ""}</div>
          {reading
            ? <div className="slip-source" role="status">Reading this slip…</div>
            : timeNote && <div className="slip-source" data-state={timeNote.missing ? "missing" : "found"}>{timeNote.text}</div>}
        </div>
      </section>

      {slip.duplicateOf && (
        <p className="sheet-warn" role="status">
          Looks like a duplicate of {slip.duplicateOf.description || "a transaction"}, {currencySymbol(account?.currency)}
          {slip.duplicateOf.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          {", "}{new Date(slip.duplicateOf.date).toLocaleTimeString("en-US", { timeZone: "Asia/Bangkok", hour: "numeric", minute: "2-digit" })}.
          You can still confirm it.
        </p>
      )}

      {unreadable && (
        <div className="sheet-warn" role="status">
          Couldn&apos;t read this slip. Fill it in from the screenshot.
          {slip.rawText && (
            <details className="slip-raw">
              <summary>Text the phone read</summary>
              <pre>{slip.rawText}</pre>
            </details>
          )}
        </div>
      )}

      <div className="seg" role="group" aria-label="Transaction type">
        {(["expense", "income"] as const).map(t => (
          <button key={t} type="button" data-kind={t} aria-pressed={type === t} onClick={() => { setType(t); setCategoryId("") }}>
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div>
        <label className="field-label" htmlFor="slip-amount">Amount</label>
        <input
          id="slip-amount" className="field-input num" inputMode="decimal" autoComplete="off" placeholder="0"
          value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
        />
      </div>

      <div>
        <label className="field-label" htmlFor="slip-note">Note</label>
        <input id="slip-note" type="text" className="field-input" placeholder="e.g. Coffee shop" value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="when-row">
        <div>
          <span className="field-label">Date</span>
          <DatePicker inline value={date} onChange={setDate} />
        </div>
        <div>
          <span className="field-label">Time</span>
          <TimePicker inline value={time} onChange={setTime} />
        </div>
      </div>

      <div>
        <span className="field-label">Account</span>
        <Select
          ariaLabel="Account" value={accountId} onChange={setAccountId} placeholder="Select account"
          options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
        />
        {slip.suggestedAccountId != null && accountId === String(slip.suggestedAccountId) && (
          <p className="slip-source" style={{ margin: "6px 0 0" }}>
            Chosen from the bank in your Shortcut{slip.bank ? ` (${slip.bank})` : ""}
          </p>
        )}
      </div>

      <div>
        <span className="field-label">Category</span>
        <div className="chip-row">
          {shown.map(c => (
            <button key={c.id} type="button" className="chip" aria-pressed={String(c.id) === categoryId} onClick={() => setCategoryId(String(c.id) === categoryId ? "" : String(c.id))}>
              <CategoryIcon category={c} size="sm" />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      </div>

      {/* Pinned to the bottom of the screen so Confirm never needs a scroll; errors sit with it so they are seen */}
      <div className="slip-actions">
        {error && <p className="sheet-error" role="alert">{error}</p>}
        <div className="slip-actions-row">
          <button type="button" onClick={reject} disabled={busy}>Reject</button>
          <button type="submit" disabled={busy || reading}>
            {busy ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>

      {zoomed && imageUrl && (
        <BottomSheet title="Screenshot" onClose={() => setZoomed(false)}>
          <div className="slip-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="The bank app screenshot this slip was read from" />
          </div>
        </BottomSheet>
      )}
    </form>
  )
}
