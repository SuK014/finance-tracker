// Cash side of a portfolio trade. Prices are in the asset's currency (usually
// USD); the account the money moves through can be in another one.

const round2 = (n: number) => Math.round(n * 100) / 100

/** Amount to move on the account, or null when there is no sensible conversion. */
export function cashAmount(
  accountCurrency: string,
  assetCurrency: string,
  assetAmount: number,
  usdthb: number | null,
): number | null {
  if (accountCurrency === assetCurrency) return round2(assetAmount)
  if (usdthb === null || usdthb <= 0) return null
  if (accountCurrency === "THB" && assetCurrency === "USD") return round2(assetAmount * usdthb)
  if (accountCurrency === "USD" && assetCurrency === "THB") return round2(assetAmount / usdthb)
  return null
}

export function tradeDescription(lotType: "buy" | "sell", symbol: string, quantity: number): string {
  const qty = Number(quantity.toFixed(6))
  return `${lotType === "buy" ? "Buy" : "Sell"} ${symbol} ×${qty}`
}
