"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createCategory, createTransaction, extractSlips, getAccounts, getCategories, uploadEvidence } from "@/lib/api"
import { currencySymbol } from "@/lib/currency"
import { categoryEmoji } from "@/lib/categoryIcon"
import Select from "@/components/Select"
import DatePicker from "@/components/DatePicker"
import TimePicker from "@/components/TimePicker"
import EmojiPicker from "@/components/EmojiPicker"
import CategoryIcon from "@/components/CategoryIcon"
import VoiceInput from "@/components/VoiceInput"
import type { VoiceParse } from "@/lib/api"

type Account = { id: number; name: string; currency?: string; setAside?: number; available?: number }
type Category = { id: number; name: string; color?: string | null; icon?: string | null; type?: string }

const AddSheetContext = createContext<{ open: () => void }>({ open: () => {} })
export const useAddSheet = () => useContext(AddSheetContext)

function nowParts() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

// Turn the backend's raw error text into something a person can act on.
function scanErrorMessage(reason?: string): string {
  const r = reason ?? ""
  if (/Unknown VISION_PROVIDER|API_KEY is not set|api[_ ]?key|401|403|PERMISSION_DENIED|authentication|invalid x-api-key/i.test(r))
    return "The slip reader isn't set up correctly: check the API key and VISION_PROVIDER in the backend settings."
  if (/429|quota|rate.?limit|RESOURCE_EXHAUSTED|overloaded|529/i.test(r))
    return "The slip reader is busy or its free limit is used up. Wait a minute and try again."
  if (/404|not found|model/i.test(r))
    return "The slip reader's model name wasn't accepted. Check the model setting in the backend."
  if (/No JSON|JSON/i.test(r))
    return "Couldn't find the details on that photo. Try a clearer, flatter photo or enter the amount yourself."
  return "Couldn't read that slip. Try a clearer photo or enter the amount yourself."
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"]

export function AddSheetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"closed" | "open" | "closing">("closed")
  const [toast, setToast] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const open = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement | null
    setState("open")
  }, [])

  const close = useCallback(() => {
    setState(s => (s === "open" ? "closing" : s))
    window.setTimeout(() => {
      setState("closed")
      triggerRef.current?.focus?.()
    }, 200)
  }, [])

  function saved() {
    close()
    setToast("Transaction saved")
    window.setTimeout(() => setToast(null), 2400)
  }

  return (
    <AddSheetContext.Provider value={{ open }}>
      {children}
      {state !== "closed" && <Sheet closing={state === "closing"} onClose={close} onSaved={saved} />}
      <div aria-live="polite" role="status">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </AddSheetContext.Provider>
  )
}

function Sheet({ closing, onClose, onSaved }: { closing: boolean; onClose: () => void; onSaved: () => void }) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scanRef = useRef<HTMLInputElement>(null)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadError, setLoadError] = useState(false)
  const [useKeypad, setUseKeypad] = useState(false)

  const [type, setType] = useState<"expense" | "income">("expense")
  const [amount, setAmount] = useState("")
  const [accountId, setAccountId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [description, setDescription] = useState("")
  const [{ date, time }, setWhen] = useState(nowParts)
  const [evidence, setEvidence] = useState<File | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState("")
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanNote, setScanNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUseKeypad(window.matchMedia("(pointer: coarse), (max-width: 768px)").matches)
    Promise.all([getAccounts(), getCategories()])
      .then(([a, c]) => {
        const accs: Account[] = Array.isArray(a) ? a : []
        setAccounts(accs)
        setCategories(Array.isArray(c) ? c : [])
        let last = ""
        try { last = localStorage.getItem("lastAccountId") ?? "" } catch {}
        const pick = accs.find(x => String(x.id) === last) ?? accs[0]
        if (pick) setAccountId(String(pick.id))
      })
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    // Phones get the on-screen keypad (native keyboard suppressed); desktop types directly.
    if (!useKeypad) amountRef.current?.focus()
    else panelRef.current?.focus()
  }, [useKeypad])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation()
      // A date/time picker handles its own Escape; only close the sheet when none is open.
      if (!panelRef.current?.querySelector('[aria-expanded="true"]')) onClose()
      return
    }
    if (e.key !== "Tab") return
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  function press(k: string) {
    setAmount(a => {
      if (k === "⌫") return a.slice(0, -1)
      if (k === ".") return a.includes(".") ? a : (a === "" ? "0." : a + ".")
      if (a.replace(".", "").length >= 9) return a
      const dot = a.indexOf(".")
      if (dot >= 0 && a.length - dot > 2) return a
      return a === "0" ? k : a + k
    })
  }

  function onAmountInput(v: string) {
    const clean = v.replace(/[^0-9.]/g, "")
    const parts = clean.split(".")
    const joined = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}` : clean
    setAmount(joined.slice(0, 12))
  }

  const account = accounts.find(a => String(a.id) === accountId)
  const shown = categories.filter(c => !c.type || c.type === type)
  // A heads-up (not a block) when spending would dip into money set aside for goals.
  const intoGoals =
    type === "expense" && account && (account.setAside ?? 0) > 0 && Number(amount) > (account.available ?? Infinity)

  async function scanSlip(file: File | undefined) {
    if (!file) return
    setError(null)
    setScanNote(null)
    setScanning(true)
    try {
      const results = await extractSlips([file])
      const r = Array.isArray(results) ? results[0] : undefined
      if (!r?.success || !r.data) {
        const reason = Array.isArray(results) ? r?.error : (results as { error?: string } | undefined)?.error
        setError(scanErrorMessage(reason))
        return
      }
      const d = r.data
      if (d.amount != null) setAmount(String(Math.abs(Number(d.amount))))
      if (d.type === "income" || d.type === "expense") { setType(d.type); setCategoryId("") }
      if (d.description) setDescription(d.description)
      if (d.date && /^\d{4}-\d{2}-\d{2}/.test(d.date)) {
        const day = d.date.slice(0, 10)
        const clock = /T\d{2}:\d{2}/.test(d.date) ? d.date.slice(11, 16) : ""
        setWhen(w => ({ date: day, time: clock || w.time }))
      }
      setEvidence(file)
      setScanNote(d.amount != null ? "Filled in from your slip. Check the details, then save." : "Couldn't find an amount on that slip. Fill it in below.")
    } catch {
      setError("Couldn't scan the slip. Check your connection and try again.")
    } finally {
      setScanning(false)
      if (scanRef.current) scanRef.current.value = ""
    }
  }

  function applyVoice(r: VoiceParse, heard: string) {
    setError(null)
    setType(r.type)
    setCategoryId(r.categoryId ? String(r.categoryId) : "")
    if (r.amount != null) setAmount(String(r.amount))
    if (r.description) setDescription(r.description)
    if (r.date) setWhen(w => ({ ...w, date: r.date as string }))
    setScanNote(
      r.amount != null
        ? `Heard “${heard}”. Check the details, then save.`
        : `Heard “${heard}”, but no amount. Fill it in below.`
    )
  }

  async function addCategory() {
    if (!newName.trim()) return
    setError(null)
    try {
      const result = await createCategory({ name: newName.trim(), type, icon: newIcon || undefined, color: "#6a5ae0" })
      if (result?.error) { setError(result.error); return }
      setCategories(c => [...c, result])
      setCategoryId(String(result.id))
      setAdding(false)
      setNewName("")
      setNewIcon("")
    } catch {
      setError("Couldn't add the category. Check your connection and try again.")
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!accountId) { setError("Pick an account first."); return }
    if (!amount || Number(amount) <= 0) { setError("Enter an amount greater than 0."); return }
    setSaving(true)
    try {
      const tx = await createTransaction({
        amount: Number(amount),
        type,
        date: time ? `${date}T${time}` : date,
        description,
        accountId: Number(accountId),
        categoryId: categoryId ? Number(categoryId) : undefined,
      })
      if (tx?.error) { setError(tx.error); return }
      if (evidence && tx?.id) await uploadEvidence(tx.id, evidence)
      try { localStorage.setItem("lastAccountId", accountId) } catch {}
      router.refresh()
      onSaved()
    } catch {
      setError("Couldn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  const state = closing ? "closing" : "open"

  return (
    <>
      <div className="sheet-backdrop" data-state={state} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="sheet"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id="sheet-title">Add transaction</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="sheet-form" onSubmit={save}>
          <div className="sheet-scroll">
          <input
            ref={scanRef}
            type="file"
            accept="image/*"
            aria-label="Slip photo"
            style={{ display: "none" }}
            onChange={e => scanSlip(e.target.files?.[0])}
          />
          <button type="button" className="scan-btn" onClick={() => scanRef.current?.click()} disabled={scanning}>
            <span aria-hidden="true">📷</span> {scanning ? "Reading receipt…" : "Scan a receipt"}
          </button>
          <VoiceInput categories={categories} onResult={applyVoice} />
          {scanNote && <p className="sheet-note" role="status">{scanNote}</p>}
          <div className="seg" role="group" aria-label="Transaction type">
            {(["expense", "income"] as const).map(t => (
              <button
                key={t}
                type="button"
                data-kind={t}
                aria-pressed={type === t}
                onClick={() => { setType(t); setCategoryId("") }}
              >
                {t === "expense" ? "Expense" : "Income"}
              </button>
            ))}
          </div>

          <div className="sheet-amount">
            <span className="cur" aria-hidden="true">{currencySymbol(account?.currency)}</span>
            <label htmlFor="sheet-amount" className="sr-only">Amount</label>
            <input
              id="sheet-amount"
              ref={amountRef}
              className="num"
              style={{ width: `${Math.max(1, amount.length) + 0.4}ch` }}
              inputMode={useKeypad ? "none" : "decimal"}
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={e => onAmountInput(e.target.value)}
            />
          </div>

          <div className={`keypad${useKeypad ? " show" : ""}`} role="group" aria-label="Amount keypad">
            {KEYS.map(k => (
              <button key={k} type="button" onClick={() => press(k)} aria-label={k === "⌫" ? "Delete" : k}>
                {k}
              </button>
            ))}
          </div>

          {intoGoals && account && (
            <p className="sheet-warn" role="status">
              That&apos;s more than the ฿{Math.max(0, Math.round(account.available ?? 0)).toLocaleString()} available in {account.name}. The rest comes out of money set aside for your goals.
            </p>
          )}

          <div>
            <span className="field-label">Category</span>
            <div className="chip-row">
              {shown.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={String(c.id) === categoryId}
                  onClick={() => setCategoryId(String(c.id) === categoryId ? "" : String(c.id))}
                >
                  <CategoryIcon category={c} size="sm" />
                  {c.name}
                </button>
              ))}
              {!adding && (
                <button type="button" className="chip add" onClick={() => setAdding(true)}>
                  + New
                </button>
              )}
            </div>
            {adding && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                <EmojiPicker value={newIcon} onChange={setNewIcon} />
                <input
                  type="text"
                  className="field-input"
                  placeholder="Category name"
                  aria-label="New category name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategory() } }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={addCategory} style={{ flex: 1 }}>
                    Add {newIcon || categoryEmoji({ name: newName, type })} category
                  </button>
                  <button type="button" onClick={() => { setAdding(false); setNewName(""); setNewIcon("") }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <span className="field-label">Account</span>
            <Select
              ariaLabel="Account"
              value={accountId}
              onChange={v => { setAccountId(v) }}
              placeholder={loadError ? "Couldn't load accounts" : "Select account"}
              options={accounts.map(a => ({ value: String(a.id), label: a.name }))}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="sheet-note">Note</label>
            <input
              id="sheet-note"
              type="text"
              className="field-input"
              placeholder="e.g. Groceries at Big C"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="when-row">
            <div>
              <span className="field-label">Date</span>
              <DatePicker inline value={date} onChange={d => setWhen(w => ({ ...w, date: d }))} />
            </div>
            <div>
              <span className="field-label">Time</span>
              <TimePicker inline value={time} onChange={t => setWhen(w => ({ ...w, time: t }))} />
            </div>
          </div>

          <div>
            <span className="field-label">Receipt</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label="Receipt photo"
              style={{ display: "none" }}
              onChange={e => setEvidence(e.target.files?.[0] ?? null)}
            />
            <button type="button" onClick={() => fileRef.current?.click()} style={{ width: "100%" }}>
              {evidence ? `📎 ${evidence.name}` : "Attach a receipt photo"}
            </button>
          </div>
          </div>

          <div className="sheet-foot">
            {error && <p className="sheet-error" role="alert">{error}</p>}
            <button type="submit" className="sheet-save" disabled={saving}>
              {saving ? "Saving…" : "Save transaction"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
