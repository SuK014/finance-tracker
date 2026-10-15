"use client"

import { useEffect, useState } from "react"
import Select from "@/components/Select"
import { currencySymbol } from "@/lib/currency"
import { cashPreview } from "@/lib/investing"
import { getDefaultInvestAccount, setDefaultInvestAccount } from "@/lib/investDefault"

export type InvestAccount = { id: number; name: string; currency?: string }

// "Pay from" (buy) or "Deposit to" (sell): which account the cash moves through.
// Leaving it on "Don't link" records only the portfolio trade, as before.
export default function InvestAccountSelect({
  mode,
  accounts,
  value,
  onChange,
  assetCurrency,
  assetAmount,
  usdthb,
}: {
  mode: "buy" | "sell"
  accounts: InvestAccount[]
  value: string
  onChange: (id: string) => void
  assetCurrency: string
  assetAmount: number
  usdthb: number | null
}) {
  const [defaultId, setDefaultId] = useState("")
  useEffect(() => { setDefaultId(getDefaultInvestAccount(accounts)) }, [accounts])
  const label = mode === "buy" ? "Pay from account" : "Deposit to account"
  const account = accounts.find(a => String(a.id) === value)
  const cur = account?.currency ?? "THB"
  const preview = account ? cashPreview(cur, assetCurrency, assetAmount, usdthb) : null
  const convertible = !account || cur === assetCurrency || cur === "THB" || cur === "USD"

  return (
    <div>
      <span className="field-label">{label}</span>
      <Select
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={[
          { value: "", label: "Don't link to an account" },
          ...accounts.map(a => ({ value: String(a.id), label: `${a.name} (${a.currency ?? "THB"})` })),
        ]}
      />
      {account && (
        <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0 0", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={defaultId === value}
            onChange={e => {
              const next = e.target.checked ? value : ""
              setDefaultInvestAccount(next)
              setDefaultId(next)
            }}
            style={{ width: "auto", minHeight: 0, margin: 0 }}
          />
          Use {account.name} as my default account
        </label>
      )}
      {account && preview !== null && (
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-secondary)" }} role="status">
          {mode === "buy" ? "Takes about" : "Adds about"}{" "}
          <strong className="num">
            {currencySymbol(cur)}{preview.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>{" "}
          {mode === "buy" ? "out of" : "to"} {account.name}.
        </p>
      )}
      {!convertible && (
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--expense)" }} role="alert">
          Pick a THB or USD account, or don&apos;t link one.
        </p>
      )}
    </div>
  )
}
