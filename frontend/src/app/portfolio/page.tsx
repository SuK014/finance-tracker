import { getPortfolio } from "@/lib/serverApi"
import AddAssetForm from "@/components/AddAssetForm"
import SellAssetButton from "@/components/SellAssetButton"
import Link from "next/link"
import SectionTabs from "@/components/SectionTabs"

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
    <main>
      <SectionTabs group="wealth" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Portfolio</h1>
        <Link href="/portfolio/transactions">View transaction history</Link>
      </div>


      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Symbol</th>
            <th scope="col">Name</th>
            <th scope="col" style={{ textAlign: "right" }}>Shares</th>
            <th scope="col" style={{ textAlign: "right" }}>Avg Cost</th>
            <th scope="col" style={{ textAlign: "right" }}>Current Price</th>
            <th scope="col" style={{ textAlign: "right" }}>Total Value</th>
            <th scope="col" style={{ textAlign: "right" }}>Gain/Loss</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.id}>
              <th scope="row" style={{ textAlign: "left", fontWeight: 500 }}>{h.symbol}</th>
              <td>{h.name}</td>
              <td className="num" style={{ textAlign: "right" }}>{(h.totalShares ?? 0).toFixed(6)}</td>
              <td className="num" style={{ textAlign: "right" }}>{sym(h.currency)}{(h.avgCost ?? 0).toFixed(2)}</td>
              <td className="num" style={{ textAlign: "right" }}>{sym(h.currency)}{(h.currentPrice ?? 0).toFixed(2)}</td>
              <td className="num" style={{ textAlign: "right" }}>{sym(h.currency)}{(h.totalValue ?? 0).toFixed(2)}</td>
              <td className="num" style={{ textAlign: "right", color: (h.gainLoss ?? 0) >= 0 ? "var(--income)" : "var(--expense)" }}>
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
    </main>
  )
}
