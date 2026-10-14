// Mirrors the backend's conversion so the form can preview what will move on the account.
// The server recomputes it with the live rate when the trade is saved.
export function cashPreview(
  accountCurrency: string,
  assetCurrency: string,
  assetAmount: number,
  usdthb: number | null,
): number | null {
  if (!(assetAmount > 0)) return null
  if (accountCurrency === assetCurrency) return assetAmount
  if (!usdthb) return null
  if (accountCurrency === "THB" && assetCurrency === "USD") return assetAmount * usdthb
  if (accountCurrency === "USD" && assetCurrency === "THB") return assetAmount / usdthb
  return null
}
