import { currencySymbol } from "@/lib/currency"

type Billed = { currency?: string | null; account?: { currency?: string | null } | null }

/** The currency a subscription's price is quoted in: its own, otherwise its account's, otherwise baht. */
export function billedCurrency(item: Billed): string {
  return item.currency ?? item.account?.currency ?? "THB"
}

/** An amount in baht, or null when it is in another currency and there is no rate. */
export function toThb(amount: number, currency: string, usdthb: number | null): number | null {
  if (currency === "THB") return amount
  if (currency === "USD" && usdthb && usdthb > 0) return amount * usdthb
  return null
}

export function priceText(amount: number, currency: string): string {
  const frac = currency === "USD" ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 }
  return `${currencySymbol(currency)}${amount.toLocaleString(undefined, frac)}`
}
