import { getLots } from "@/lib/serverApi"
import Link from "next/link"
import LotActions from "@/components/LotActions"

type Lot = {
  id: number
  lotType: string
  quantity: number
  price: number
  date: string
  asset: {
    symbol: string
    name: string
    currency: string
  }
}

export default async function TransactionsPage() {
  const lots: Lot[] = await getLots()

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Transaction History</h1>
        <Link href="/portfolio">← Back to Holdings</Link>
      </div>

      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Symbol</th>
            <th>Name</th>
            <th>Shares</th>
            <th>Price</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => (
            <tr key={lot.id}>
              <td className="num">{new Date(lot.date).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" })}</td>
              <td style={{ color: lot.lotType === "buy" ? "var(--income)" : "var(--expense)" }}>
                {lot.lotType.toUpperCase()}
              </td>
              <td>{lot.asset.symbol}</td>
              <td>{lot.asset.name}</td>
              <td className="num">{lot.quantity.toFixed(6)}</td>
              <td className="num">{lot.asset.currency === "THB" ? "฿" : "$"}{lot.price.toFixed(2)}</td>
              <td className="num">{lot.asset.currency === "THB" ? "฿" : "$"}{(lot.quantity * lot.price).toFixed(2)}</td>
              <td>
                <LotActions lot={lot} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
