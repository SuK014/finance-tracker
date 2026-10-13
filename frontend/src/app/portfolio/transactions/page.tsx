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
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Transaction History</h1>
        <Link href="/portfolio">Back to Holdings</Link>
      </div>

      <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Type</th>
            <th scope="col">Symbol</th>
            <th scope="col">Name</th>
            <th scope="col" style={{ textAlign: "right" }}>Shares</th>
            <th scope="col" style={{ textAlign: "right" }}>Price</th>
            <th scope="col" style={{ textAlign: "right" }}>Total</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => (
            <tr key={lot.id}>
              <th scope="row" className="num" style={{ textAlign: "left", fontWeight: 500 }}>
                {new Date(lot.date).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" })}
              </th>
              <td style={{ color: lot.lotType === "buy" ? "var(--income)" : "var(--expense)" }}>
                {lot.lotType.toUpperCase()}
              </td>
              <td>{lot.asset.symbol}</td>
              <td>{lot.asset.name}</td>
              <td className="num" style={{ textAlign: "right" }}>{lot.quantity.toFixed(6)}</td>
              <td className="num" style={{ textAlign: "right" }}>{lot.asset.currency === "THB" ? "฿" : "$"}{lot.price.toFixed(2)}</td>
              <td className="num" style={{ textAlign: "right" }}>{lot.asset.currency === "THB" ? "฿" : "$"}{(lot.quantity * lot.price).toFixed(2)}</td>
              <td>
                <LotActions lot={lot} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </main>
  )
}
