"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBond, deleteBond, updateBond } from "@/lib/api"
import { bondValue, fullDate, type Bond } from "@/lib/bonds"
import BottomSheet from "@/components/BottomSheet"
import DatePicker from "@/components/DatePicker"

const baht = (n: number) => `฿${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Bonds held directly. There's no live price, so each is worth what you paid plus the interest earned so far.
export default function BondSection({ bonds }: { bonds: Bond[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Bond | "new" | null>(null)

  async function remove(b: Bond) {
    if (!confirm(`Delete "${b.name}"?`)) return
    await deleteBond(b.id)
    router.refresh()
  }

  return (
    <section aria-labelledby="bonds-h" className="bond-section card">
      <div className="goals-head">
        <h2 id="bonds-h" style={{ margin: 0 }}>Bonds</h2>
        <button type="button" onClick={() => setEditing("new")}>+ Add a bond</button>
      </div>

      {bonds.length === 0 ? (
        <p className="goal-hint">Hold a government or savings bond? Add it with its interest rate and it will count in your net worth.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col" style={{ textAlign: "right" }}>Paid</th>
                <th scope="col" style={{ textAlign: "right" }}>Rate</th>
                <th scope="col">Matures</th>
                <th scope="col" style={{ textAlign: "right" }}>Worth today</th>
                <th scope="col" style={{ textAlign: "right" }}>Interest earned</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {bonds.map(b => {
                const { value, interest, matured } = bondValue(b)
                return (
                  <tr key={b.id}>
                    <th scope="row" style={{ textAlign: "left", fontWeight: 500 }}>{b.name}</th>
                    <td className="num" style={{ textAlign: "right" }}>{baht(b.principal)}</td>
                    <td className="num" style={{ textAlign: "right" }}>{b.ratePct}%</td>
                    <td>{fullDate(b.maturityDate)}{matured ? " · Matured" : ""}</td>
                    <td className="num" style={{ textAlign: "right" }}>{baht(value)}</td>
                    <td className="num" style={{ textAlign: "right", color: "var(--income)" }}>+{baht(interest)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button type="button" onClick={() => setEditing(b)} aria-label={`Edit ${b.name}`}>Edit</button>{" "}
                      <button type="button" onClick={() => remove(b)} aria-label={`Delete ${b.name}`}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <BondSheet
          bond={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); router.refresh() }}
        />
      )}
    </section>
  )
}

function BondSheet({ bond, onClose, onDone }: { bond?: Bond; onClose: () => void; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState(bond?.name ?? "")
  const [principal, setPrincipal] = useState(bond ? String(bond.principal) : "")
  const [rate, setRate] = useState(bond ? String(bond.ratePct) : "")
  const [startDate, setStartDate] = useState(bond ? bond.startDate.slice(0, 10) : today)
  const [maturityDate, setMaturityDate] = useState(bond ? bond.maturityDate.slice(0, 10) : "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) { setError("Give the bond a name."); return }
    if (!(Number(principal) > 0)) { setError("Enter the amount you paid."); return }
    if (rate === "" || !(Number(rate) >= 0 && Number(rate) <= 100)) { setError("Enter the yearly interest rate, between 0 and 100."); return }
    if (!maturityDate) { setError("Pick the maturity date."); return }
    if (maturityDate <= startDate) { setError("The maturity date must be after the start date."); return }
    setSaving(true)
    try {
      const body = { name: name.trim(), principal: Number(principal), ratePct: Number(rate), startDate, maturityDate }
      const res = bond ? await updateBond(bond.id, body) : await createBond(body)
      if (res?.error) { setError(res.error); return }
      onDone()
    } catch {
      setError("Couldn't save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet title={bond ? "Edit bond" : "Add a bond"} onClose={onClose}>
      <form className="sheet-form" onSubmit={submit}>
        <div className="sheet-scroll">
          <div>
            <label className="field-label" htmlFor="bond-name">Name</label>
            <input id="bond-name" type="text" className="field-input" placeholder="e.g. Savings bond 2028" value={name} onChange={e => setName(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="field-label" htmlFor="bond-paid">Amount paid</label>
            <div className="goal-money-input">
              <span aria-hidden="true">฿</span>
              <input id="bond-paid" type="number" inputMode="decimal" min="1" step="any" placeholder="10000" value={principal} onChange={e => setPrincipal(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="bond-rate">Interest rate per year</label>
            <div className="goal-money-input">
              <span aria-hidden="true">%</span>
              <input id="bond-rate" type="number" inputMode="decimal" min="0" max="100" step="any" placeholder="2.5" value={rate} onChange={e => setRate(e.target.value)} />
            </div>
          </div>
          <div>
            <span className="field-label">Start date</span>
            <DatePicker inline value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <span className="field-label">Maturity date</span>
            <DatePicker inline value={maturityDate} onChange={setMaturityDate} />
          </div>
          <p className="goal-hint">Interest is counted simply, from the start date to maturity, with no compounding.</p>
        </div>
        <div className="sheet-foot">
          {error && <p className="sheet-error" role="alert">{error}</p>}
          <button type="submit" className="sheet-save" disabled={saving}>{saving ? "Saving…" : bond ? "Save bond" : "Add bond"}</button>
        </div>
      </form>
    </BottomSheet>
  )
}
