import YahooFinance from "yahoo-finance2"

const yf = new YahooFinance()

/** Today's USD -> THB rate, or null when it can't be fetched. */
export async function getUsdThb(): Promise<number | null> {
  try {
    const fx = await yf.quote("USDTHB=X")
    return fx.regularMarketPrice ?? null
  } catch (err) {
    console.error("[fx] could not fetch USDTHB:", err)
    return null
  }
}
