export type Goal = {
  id: number
  name: string
  icon?: string | null
  target: number
  deadline?: string | null
  ruleType?: "fixed" | "percent" | null
  ruleValue?: number | null
  saved: number
  // Where the goal's money sits: the accounts holding it, and how much in each.
  accounts: { accountId: number; amount: number }[]
}

export type GoalAccount = {
  id: number
  name: string
  type?: string
  currency?: string
  balance?: number
  setAside?: number
  available?: number
}

export function goalPercent(g: Pick<Goal, "saved" | "target">): number {
  if (!(g.target > 0)) return 0
  return Math.max(0, Math.min(100, Math.floor((g.saved / g.target) * 100)))
}

export const isReached = (g: Pick<Goal, "saved" | "target">) => g.target > 0 && g.saved >= g.target

/** Whole baht to put away each month to finish by the deadline, or null with no (future) deadline. */
export function monthlyNeeded(g: Pick<Goal, "saved" | "target" | "deadline">, now = new Date()): number | null {
  if (!g.deadline) return null
  const remaining = g.target - g.saved
  if (remaining <= 0) return null
  const end = new Date(g.deadline)
  if (end <= now) return null
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()) + (end.getDate() >= now.getDate() ? 1 : 0)
  return Math.ceil(remaining / Math.max(1, months))
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "Mar 2027". Written out by hand: browsers disagree on "Sep" vs "Sept". */
export function monthYear(iso: string): string {
  const d = new Date(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`

/** Money in accounts that you can spend: balance minus what is set aside, for ordinary (non-credit) accounts. */
export function totalAvailable(accounts: GoalAccount[]): number {
  return accounts.filter(a => a.type !== "credit_card" && (a.currency ?? "THB") === "THB").reduce((s, a) => s + (a.available ?? a.balance ?? 0), 0)
}

export type Salary = {
  id: number
  amount: number
  description?: string | null
  frequency: string
  nextDate: string
  accountId: number
  account?: { name: string } | null
}

/** What a goal's pay-yourself-first rule sets aside from a salary, rounded to 2 decimals. */
export function ruleDefault(g: Pick<Goal, "ruleType" | "ruleValue">, received: number): number {
  if (!g.ruleType || !g.ruleValue || !(received > 0)) return 0
  const n = g.ruleType === "fixed" ? g.ruleValue : (received * g.ruleValue) / 100
  return Math.round(n * 100) / 100
}

/** "25 Oct". Built by hand so every browser spells months the same. */
export function dayMonth(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
