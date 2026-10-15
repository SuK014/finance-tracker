"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRecurring, receiveSalary, updateRecurring } from "@/lib/api"
import { baht, dayMonth, ruleDefault, type Goal, type GoalAccount, type Salary } from "@/lib/goals"
import BottomSheet from "@/components/BottomSheet"
import DatePicker from "@/components/DatePicker"
import Select from "@/components/Select"

type Sheet = "setup" | "edit" | "receive" | null

function ruleText(g: Goal): string | null {
  if (!g.ruleType || !g.ruleValue) return null
  return g.ruleType === "fixed" ? `${g.name} ${baht(g.ruleValue)}` : `${g.name} ${g.ruleValue}%`
}

// The pay-yourself-first card: your salary, when it next arrives, and what you set aside from it.
export default function Payday({ salary, goals, accounts }: { salary: Salary | null; goals: Goal[]; accounts: GoalAccount[] }) {
  const router = useRouter()
  const [sheet, setSheet] = useState<Sheet>(null)
  const done = () => { setSheet(null); router.refresh() }
  const rules = goals.map(ruleText).filter(Boolean)

  return (
    <>
      {salary ? (
        <section className="payday-card" aria-label="Payday">
          <div className="payday-top">
            <div>
              <small>Next payday · {dayMonth(salary.nextDate)}</small>
              <b className="num">{baht(salary.amount)}</b>
              <span className="payday-into">into {accounts.find(a => a.id === salary.accountId)?.name ?? salary.account?.name ?? "your account"}</span>
            </div>
            <button type="button" className="goal-primary" onClick={() => setSheet("receive")}>Mark received</button>
          </div>
          <p className="goal-hint" style={{ margin: 0 }}>
            {rules.length > 0 ? <>Each payday you set aside: {rules.join(" · ")}</> : "Add a saving rule to a goal and it will be suggested each payday."}
          </p>
          <button type="button" className="payday-edit" onClick={() => setSheet("edit")}>Edit salary</button>
        </section>
      ) : (
        <section className="payday-card" aria-label="Payday">
          <p className="goal-hint" style={{ margin: 0 }}>Pay yourself first: tell us when your salary arrives, and set money aside for your goals before you spend it.</p>
          <button type="button" className="goal-primary" onClick={() => setSheet("setup")}>Set up your salary</button>
        </section>
      )}

      {(sheet === "setup" || sheet === "edit") && (
        <SalarySheet salary={sheet === "edit" ? salary : null} accounts={accounts} onClose={() => setSheet(null)} onDone={done} />
      )}
      {sheet === "receive" && salary && <ReceiveSheet salary={salary} goals={goals} onClose={() => setSheet(null)} onDone={done} />}
    </>
  )
}

function SalarySheet({ salary, accounts, onClose, onDone }: { salary: Salary | null; accounts: GoalAccount[]; onClose: () => void; onDone: () => void }) {
  const usable = accounts.filter(a => a.type !== "credit_card")
  const [amount, setAmount] = useState(salary ? String(salary.amount) : "")
  const [accountId, setAccountId] = useState(salary ? String(salary.accountId) : usable[0] ? String(usable[0].id) : "")
  const [nextDate, setNextDate] = useState(salary ? salary.nextDate.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!(Number(amount) > 0)) { setError("Enter your usual salary."); return }
    if (!accountId) { setError("Pick the account your salary goes into."); return }
    if (!nextDate) { setError("Pick your next payday."); return }
    setSaving(true)
    try {
      const body = { amount: Number(amount), type: "income", description: "Salary", accountId: Number(accountId), frequency: "monthly", nextDate }
      const res = salary ? await updateRecurring(salary.id, body) : await createRecurring(body)
      if (res?.error) { setError(res.error); return }
      onDone()
    } catch {
      setError("Couldn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet title={salary ? "Edit salary" : "Set up your salary"} onClose={onClose}>
      <form className="sheet-form" onSubmit={submit}>
        <div className="sheet-scroll">
          <div>
            <label className="field-label" htmlFor="salary-amount">Usual monthly salary</label>
            <div className="goal-money-input">
              <span aria-hidden="true">฿</span>
              <input id="salary-amount" type="number" inputMode="decimal" min="1" step="any" placeholder="30000" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <span className="field-label">Paid into</span>
            <Select ariaLabel="Paid into" value={accountId} onChange={setAccountId} options={usable.map(a => ({ value: String(a.id), label: a.name }))} />
          </div>
          <div>
            <span className="field-label">Next payday</span>
            <DatePicker inline value={nextDate} onChange={setNextDate} />
          </div>
        </div>
        <div className="sheet-foot">
          {error && <p className="sheet-error" role="alert">{error}</p>}
          <button type="submit" className="sheet-save" disabled={saving}>{saving ? "Saving…" : "Save salary"}</button>
        </div>
      </form>
    </BottomSheet>
  )
}

function ReceiveSheet({ salary, goals, onClose, onDone }: { salary: Salary; goals: Goal[]; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(salary.amount))
  // Amounts typed by hand; any goal not typed into follows its saving rule.
  const [typed, setTyped] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<"confirm" | "skip" | null>(null)
  const [error, setError] = useState("")

  const received = Number(amount) > 0 ? Number(amount) : 0
  const valueOf = (g: Goal) => (g.id in typed ? Number(typed[g.id]) || 0 : ruleDefault(g, received))
  const setAside = goals.reduce((s, g) => s + valueOf(g), 0)
  const keep = received - setAside

  async function submit(skipGoals: boolean) {
    setError("")
    if (!(received > 0)) { setError("Enter the amount you received."); return }
    if (!skipGoals && keep < -0.005) { setError("You're setting aside more than you received."); return }
    setSaving(skipGoals ? "skip" : "confirm")
    try {
      const allocations = skipGoals ? [] : goals.map(g => ({ goalId: g.id, amount: valueOf(g) })).filter(a => a.amount > 0)
      const res = await receiveSalary(salary.id, { amount: received, allocations })
      if (res?.error) { setError(res.error); return }
      onDone()
    } catch {
      setError("Couldn't save. Check your connection and try again.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <BottomSheet title="Salary received" onClose={onClose}>
      <form className="sheet-form" onSubmit={e => { e.preventDefault(); submit(false) }}>
        <div className="sheet-scroll">
          <div>
            <label className="field-label" htmlFor="received-amount">Amount received</label>
            <div className="goal-money-input">
              <span aria-hidden="true">฿</span>
              <input id="received-amount" type="number" inputMode="decimal" min="1" step="any" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>

          {goals.length > 0 ? (
            <div>
              <span className="field-label">Set aside for your goals</span>
              <div className="alloc-list">
                {goals.map(g => (
                  <div key={g.id} className="alloc-row">
                    <label htmlFor={`alloc-${g.id}`}><span aria-hidden="true">{g.icon || "🎯"}</span> {g.name}</label>
                    <div className="goal-money-input">
                      <span aria-hidden="true">฿</span>
                      <input
                        id={`alloc-${g.id}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={g.id in typed ? typed[g.id] : valueOf(g) > 0 ? String(valueOf(g)) : ""}
                        onChange={e => setTyped({ ...typed, [g.id]: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="goal-hint">You have no goals yet, so all of it stays available to spend.</p>
          )}

          <p className="payday-keep" role="status" data-over={keep < -0.005}>
            You keep <b className="num">{baht(keep)}</b> to spend
          </p>
        </div>
        <div className="sheet-foot">
          {error && <p className="sheet-error" role="alert">{error}</p>}
          <button type="submit" className="sheet-save" disabled={saving !== null}>{saving === "confirm" ? "Saving…" : "Confirm"}</button>
          {goals.length > 0 && (
            <button type="button" onClick={() => submit(true)} disabled={saving !== null}>{saving === "skip" ? "Saving…" : "Skip goals this month"}</button>
          )}
        </div>
      </form>
    </BottomSheet>
  )
}
