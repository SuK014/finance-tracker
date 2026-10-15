"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createGoal, updateGoal, deleteGoal, goalMoney } from "@/lib/api"
import { baht, goalPercent, isReached, monthlyNeeded, monthYear, type Goal, type GoalAccount } from "@/lib/goals"
import BottomSheet from "@/components/BottomSheet"
import EmojiPicker from "@/components/EmojiPicker"
import DatePicker from "@/components/DatePicker"
import Select from "@/components/Select"
import RowActionsMenu from "@/components/RowActionsMenu"

type Category = { id: number; name: string; type?: string }
type Mode = { kind: "new" } | { kind: "edit"; goal: Goal } | { kind: "deposit" | "withdraw" | "spend"; goal: Goal }

export default function GoalsView({
  goals,
  accounts,
  categories,
}: {
  goals: Goal[]
  accounts: GoalAccount[]
  categories: Category[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode | null>(null)

  const done = () => { setMode(null); router.refresh() }

  async function remove(g: Goal) {
    if (!confirm(`Delete "${g.name}"? Its ${baht(g.saved)} goes back to your available money.`)) return
    await deleteGoal(g.id)
    router.refresh()
  }

  return (
    <>
      <div className="goals-head">
        <h1>Goals</h1>
        <button type="button" className="goals-new" onClick={() => setMode({ kind: "new" })}>+ New goal</button>
      </div>

      {goals.length === 0 ? (
        <div className="card empty-state">
          <span className="big" aria-hidden="true">🎯</span>
          No goals yet. Name something you&apos;re saving for, set a target, and put money aside as you go.
        </div>
      ) : (
        <ul className="goal-list">
          {goals.map(g => (
            <GoalCard key={g.id} goal={g} accounts={accounts} onMode={setMode} onDelete={() => remove(g)} />
          ))}
        </ul>
      )}

      {mode && (mode.kind === "new" || mode.kind === "edit") && (
        <GoalFormSheet goal={mode.kind === "edit" ? mode.goal : undefined} onClose={() => setMode(null)} onDone={done} />
      )}
      {mode && (mode.kind === "deposit" || mode.kind === "withdraw" || mode.kind === "spend") && (
        <MoneySheet kind={mode.kind} goal={mode.goal} accounts={accounts} categories={categories} onClose={() => setMode(null)} onDone={done} />
      )}
    </>
  )
}

function GoalCard({
  goal: g,
  accounts,
  onMode,
  onDelete,
}: {
  goal: Goal
  accounts: GoalAccount[]
  onMode: (m: Mode) => void
  onDelete: () => void
}) {
  const pct = goalPercent(g)
  const reached = isReached(g)
  const monthly = monthlyNeeded(g)
  const holds = g.accounts.length > 0

  return (
    <li className="goal-card" data-reached={reached} aria-label={g.name}>
      <div className="goal-top">
        <span className="goal-icon" aria-hidden="true">{g.icon || "🎯"}</span>
        <div className="goal-title">
          <b>{g.name}</b>
          <span className="goal-amounts num">{baht(g.saved)} of {baht(g.target)}</span>
        </div>
        <span className="goal-pct num" aria-hidden="true">{pct}%</span>
      </div>

      <div
        className="goal-bar"
        role="progressbar"
        aria-label={`${g.name} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{ "--p": pct / 100 } as React.CSSProperties}
      >
        <i />
      </div>

      <p className="goal-sub">
        {reached
          ? "Goal reached 🎉"
          : monthly !== null
            ? `Save ${baht(monthly)} a month to finish by ${monthYear(g.deadline as string)}`
            : g.deadline
              ? `Deadline ${monthYear(g.deadline)} has passed. ${baht(g.target - g.saved)} to go`
              : `${baht(g.target - g.saved)} to go`}
      </p>
      {holds && (
        <p className="goal-where">
          {g.accounts.map(a => `${baht(a.amount)} in ${accounts.find(x => x.id === a.accountId)?.name ?? "an account"}`).join(" · ")}
        </p>
      )}

      <div className="goal-actions">
        <button type="button" className="goal-primary" onClick={() => onMode({ kind: "deposit", goal: g })}>Add money</button>
        <button type="button" onClick={() => onMode({ kind: "spend", goal: g })} disabled={!holds}>Spend</button>
        <RowActionsMenu
          actions={[
            ...(holds ? [{ label: "Take money back", onClick: () => onMode({ kind: "withdraw", goal: g }) }] : []),
            { label: "Edit goal", onClick: () => onMode({ kind: "edit", goal: g }) },
            { label: "Delete goal", onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </li>
  )
}

function GoalFormSheet({ goal, onClose, onDone }: { goal?: Goal; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(goal?.name ?? "")
  const [icon, setIcon] = useState(goal?.icon ?? "")
  const [target, setTarget] = useState(goal ? String(goal.target) : "")
  const [deadline, setDeadline] = useState(goal?.deadline ? goal.deadline.slice(0, 10) : "")
  const [askDeadline, setAskDeadline] = useState(Boolean(goal?.deadline))
  const [ruleType, setRuleType] = useState<"none" | "fixed" | "percent">(goal?.ruleType ?? "none")
  const [ruleValue, setRuleValue] = useState(goal?.ruleValue ? String(goal.ruleValue) : "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) { setError("Give the goal a name."); return }
    if (!(Number(target) > 0)) { setError("Enter a target above 0."); return }
    if (ruleType !== "none" && !(Number(ruleValue) > 0)) { setError("Enter how much to set aside each payday, or choose No rule."); return }
    if (ruleType === "percent" && Number(ruleValue) > 100) { setError("A percentage can't be more than 100."); return }
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        icon: icon || undefined,
        target: Number(target),
        deadline: askDeadline && deadline ? deadline : null,
        ruleType: ruleType === "none" ? null : ruleType,
        ruleValue: ruleType === "none" ? null : Number(ruleValue),
      }
      const res = goal ? await updateGoal(goal.id, body) : await createGoal(body)
      if (res?.error) { setError(res.error); return }
      onDone()
    } catch {
      setError("Couldn't save the goal. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet title={goal ? "Edit goal" : "New goal"} onClose={onClose}>
      <form className="sheet-form" onSubmit={submit}>
        <div className="sheet-scroll">
          <div>
            <label className="field-label" htmlFor="goal-name">Name</label>
            <input id="goal-name" type="text" className="field-input" placeholder="e.g. Japan trip" value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <span className="field-label">Icon</span>
            <EmojiPicker value={icon} onChange={setIcon} label="Goal icon" />
          </div>
          <div>
            <label className="field-label" htmlFor="goal-target">Target</label>
            <div className="goal-money-input">
              <span aria-hidden="true">฿</span>
              <input id="goal-target" type="number" inputMode="decimal" min="1" step="any" placeholder="60000" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
          </div>
          <div>
            <span className="field-label">Deadline</span>
            {askDeadline ? (
              <div className="goal-deadline">
                <DatePicker inline value={deadline} onChange={setDeadline} />
                <button type="button" onClick={() => { setAskDeadline(false); setDeadline("") }}>No deadline</button>
              </div>
            ) : (
              <button type="button" className="chip add" onClick={() => setAskDeadline(true)}>+ Add a deadline</button>
            )}
          </div>
          <div>
            <span className="field-label">Each payday</span>
            <div className="seg seg-3" role="group" aria-label="Saving rule">
              {([["none", "No rule"], ["fixed", "Fixed ฿"], ["percent", "% of salary"]] as const).map(([v, label]) => (
                <button key={v} type="button" aria-pressed={ruleType === v} onClick={() => setRuleType(v)}>{label}</button>
              ))}
            </div>
            {ruleType !== "none" && (
              <div className="goal-money-input" style={{ marginTop: "10px" }}>
                <span aria-hidden="true">{ruleType === "fixed" ? "฿" : "%"}</span>
                <input type="number" inputMode="decimal" min="0.01" step="any" aria-label="Amount to set aside each payday" placeholder={ruleType === "fixed" ? "6000" : "10"} value={ruleValue} onChange={e => setRuleValue(e.target.value)} />
              </div>
            )}
          </div>
        </div>
        <div className="sheet-foot">
          {error && <p className="sheet-error" role="alert">{error}</p>}
          <button type="submit" className="sheet-save" disabled={saving}>{saving ? "Saving…" : goal ? "Save goal" : "Create goal"}</button>
        </div>
      </form>
    </BottomSheet>
  )
}

const COPY = {
  deposit: { title: "Add money", button: "Set aside", account: "From account", hint: "Stays in the account, but it won't count as available to spend." },
  withdraw: { title: "Take money back", button: "Take back", account: "Back to account", hint: "It becomes available to spend again. Your balance doesn't change." },
  spend: { title: "Spend from goal", button: "Record spending", account: "Paid from", hint: "Records a real expense, and the goal goes down by the same amount." },
} as const

function MoneySheet({
  kind,
  goal,
  accounts,
  categories,
  onClose,
  onDone,
}: {
  kind: "deposit" | "withdraw" | "spend"
  goal: Goal
  accounts: GoalAccount[]
  categories: Category[]
  onClose: () => void
  onDone: () => void
}) {
  const copy = COPY[kind]
  // Setting money aside draws on available money; taking it back or spending uses what this goal already holds.
  const options =
    kind === "deposit"
      ? accounts
          .filter(a => a.type !== "credit_card" && (a.available ?? 0) > 0)
          .map(a => ({ value: String(a.id), label: `${a.name} · ${baht(a.available ?? 0)} available`, max: a.available ?? 0 }))
      : goal.accounts.map(h => ({
          value: String(h.accountId),
          label: `${accounts.find(a => a.id === h.accountId)?.name ?? "Account"} · ${baht(h.amount)} in this goal`,
          max: h.amount,
        }))

  const [accountId, setAccountId] = useState(options[0]?.value ?? "")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const max = options.find(o => o.value === accountId)?.max ?? 0
  const expenseCats = categories.filter(c => !c.type || c.type === "expense")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const n = Number(amount)
    if (!accountId) { setError("Pick an account."); return }
    if (!(n > 0)) { setError("Enter an amount above 0."); return }
    if (n > max + 0.005) { setError(`That's more than the ${baht(max)} you can use here.`); return }
    setSaving(true)
    try {
      const res = await goalMoney(goal.id, kind, {
        accountId: Number(accountId),
        amount: n,
        ...(kind === "spend" && categoryId ? { categoryId: Number(categoryId) } : {}),
        ...(kind === "spend" && note.trim() ? { description: note.trim() } : {}),
      })
      if (res?.error) { setError(res.error); return }
      onDone()
    } catch {
      setError("Couldn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet title={`${copy.title}: ${goal.name}`} onClose={onClose}>
      <form className="sheet-form" onSubmit={submit}>
        <div className="sheet-scroll">
          {options.length === 0 ? (
            <p className="sheet-error">
              {kind === "deposit" ? "None of your accounts has money available. Money you've already set aside isn't counted." : "This goal doesn't hold any money yet."}
            </p>
          ) : (
            <>
              <div>
                <label className="field-label" htmlFor="goal-amount">Amount</label>
                <div className="goal-money-input">
                  <span aria-hidden="true">฿</span>
                  <input id="goal-amount" type="number" inputMode="decimal" min="0.01" step="any" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
                </div>
              </div>
              <div>
                <span className="field-label">{copy.account}</span>
                <Select ariaLabel={copy.account} value={accountId} onChange={setAccountId} options={options.map(o => ({ value: o.value, label: o.label }))} />
              </div>
              {kind === "spend" && (
                <>
                  <div>
                    <span className="field-label">Category</span>
                    <Select
                      ariaLabel="Category"
                      value={categoryId}
                      onChange={setCategoryId}
                      options={[{ value: "", label: "No category" }, ...expenseCats.map(c => ({ value: String(c.id), label: c.name }))]}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="goal-note">Note</label>
                    <input id="goal-note" type="text" className="field-input" placeholder={goal.name} value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </>
              )}
              <p className="goal-hint">{copy.hint}</p>
            </>
          )}
        </div>
        <div className="sheet-foot">
          {error && <p className="sheet-error" role="alert">{error}</p>}
          <button type="submit" className="sheet-save" disabled={saving || options.length === 0}>{saving ? "Saving…" : copy.button}</button>
        </div>
      </form>
    </BottomSheet>
  )
}
