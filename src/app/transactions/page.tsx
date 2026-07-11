
import { getAccounts, getTransactions } from "@/lib/api"
import AddTransactionForm from "@/components/AddTransactionForm"


export default async function TransactionPage() {
  const accounts = await getAccounts()
  const transactions = await getTransactions()
  
  return (
    <main>
      
        <AddTransactionForm accounts={accounts}></AddTransactionForm>

        <ul>
          {transactions.map((transaction: any) => (
            <li key={transaction.id}>
              {transaction.type} — {transaction.amount} —
               {new Date(transaction.date).toLocaleString("en-GB", {
                  timeZone: "Asia/Bangkok",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
            </li>
          ))}
        </ul>
    </main>
  )
}
