// The account the investing forms pre-select ("Pay from" / "Deposit to").
// Kept in this browser only; "" means no default.
const KEY = "investDefaultAccountId"

export function getDefaultInvestAccount(accounts: { id: number }[]): string {
  try {
    const id = localStorage.getItem(KEY) ?? ""
    return accounts.some(a => String(a.id) === id) ? id : ""
  } catch {
    return ""
  }
}

export function setDefaultInvestAccount(id: string) {
  try {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch {}
}
