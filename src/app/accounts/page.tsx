
import { getAccounts } from "@/lib/api"
import AddAccountForm from "@/components/AddAccountForm"


export default async function AccountsPage() {
  const accounts = await getAccounts()
  
  return (
    <main>
      
        <AddAccountForm ></AddAccountForm>

        <ul>
          {accounts.map((account: any) => (
            <li key={account.id}>
              {account.name} — {account.type} — {account.bankName}
            </li>
          ))}
        </ul>
    </main>
  )
}
