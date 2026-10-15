export type Bond = {
  id: number
  name: string
  principal: number
  ratePct: number
  startDate: string
  maturityDate: string
  currency?: string
}

const DAY = 86_400_000

/** Simple interest from the start date, stopping at maturity. Value = amount paid + interest earned so far. */
export function bondValue(b: Pick<Bond, "principal" | "ratePct" | "startDate" | "maturityDate">, now = new Date()) {
  const start = new Date(b.startDate).getTime()
  const end = new Date(b.maturityDate).getTime()
  const elapsed = Math.min(Math.max(now.getTime() - start, 0), end - start)
  const interest = b.principal * (b.ratePct / 100) * (elapsed / DAY / 365)
  return { interest, value: b.principal + interest, matured: now.getTime() >= end }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "12 Mar 2028", built by hand so every browser spells months the same. */
export function fullDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
