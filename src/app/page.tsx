
import { getAccounts, getTransactions } from "@/lib/api"

export default async function DashboardPage() {
  const accounts = await getAccounts()
  const transactions = await getTransactions()
  
  return (
    <main>
      <ul>
        {accounts.map((account: any)=>(
          <li key = {account.id}> {account.name}</li>
        ))}
      </ul>
      <ul>
      {transactions.map((transaction: any) => (
        <li key={transaction.id}>
          {transaction.type} — {transaction.amount} — {transaction.date}
        </li>
      ))}
    </ul>
    </main>
  )
}
