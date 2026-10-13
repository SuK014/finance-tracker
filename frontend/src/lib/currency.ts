export const CURRENCIES = [
  { code: "THB", label: "Thai Baht", symbol: "฿" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
] as const

const SYMBOLS: Record<string, string> = Object.fromEntries(CURRENCIES.map(c => [c.code, c.symbol]))

export function currencySymbol(code?: string | null): string {
  if (!code) return SYMBOLS.THB
  return SYMBOLS[code] ?? code + " "
}
