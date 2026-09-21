import { getPortfolio } from "@/lib/serverApi"
import AddAssetForm from "@/components/AddAssetForm"
import SellAssetButton from "@/components/SellAssetButton"
import Link from "next/link"

type Holding = {
  id: number
  symbol: string
  name: string
  type: string
  currency: string
  totalShares: number
  avgCost: number
  currentPrice: number
  totalValue: number
  gainLoss: number
  gainLossPct: number
}

function sym(currency: string) {
  if (currency === "THB") return "฿"
  if (currency === "USD") return "$"
  return currency + " "
}

export default async function PortfolioPage() {
  const holdings: Holding[] = await getPortfolio()

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Portfolio</h1>
        <Link href="/portfolio/transactions">View Transaction History →</Link>
      </div>


      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th>Shares</th>
            <th>Avg Cost</th>
            <th>Current Price</th>
            <th>Total Value</th>
            <th>Gain/Loss</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.id}>
              <td>{h.symbol}</td>
              <td>{h.name}</td>
              <td>{(h.totalShares ?? 0).toFixed(6)}</td>
              <td>{sym(h.currency)}{(h.avgCost ?? 0).toFixed(2)}</td>
              <td>{sym(h.currency)}{(h.currentPrice ?? 0).toFixed(2)}</td>
              <td>{sym(h.currency)}{(h.totalValue ?? 0).toFixed(2)}</td>
              <td className="num" style={{ color: (h.gainLoss ?? 0) >= 0 ? "var(--income)" : "var(--expense)" }}>
                {(h.gainLoss ?? 0) >= 0 ? "+" : ""}{sym(h.currency)}{(h.gainLoss ?? 0).toFixed(2)} ({(h.gainLossPct ?? 0).toFixed(2)}%)
              </td>
              <td><SellAssetButton symbol={h.symbol} maxShares={h.totalShares} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>Add Asset</h2>
      <AddAssetForm />
    </div>
  )
}
