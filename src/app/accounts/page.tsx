import { getAccounts } from "@/lib/serverApi"
import AddAccountForm from "@/components/AddAccountForm"
import AccountActions from "@/components/AccountActions"
import Link from "next/link"

export default async function AccountsPage() {
  const accounts = await getAccounts()

  return (
    <main>
      <h1>Accounts</h1>

      <ul style={{ marginBottom: "22px" }}>
        {accounts.map((a: any) => (
          <li key={a.id} className="row-card">
            <span className="row-primary">{a.name}</span>
            <span className="row-amount num" style={{
              fontWeight: 700,
              fontSize: "15px",
              color: a.balance >= 0 ? "var(--income)" : "var(--expense)",
            }}>
              {a.balance >= 0 ? "+" : ""}฿{Number(a.balance ?? 0).toLocaleString()}
            </span>
            <span className="row-meta">
              <span>{a.type}{a.bankName ? ` · ${a.bankName}` : ""}</span>
              <Link href={`/transactions?accountId=${a.id}`} style={{ color: "var(--accent)" }}>
                View
              </Link>
            </span>
            <AccountActions account={a} />
          </li>
        ))}
      </ul>

      <h2>Add Account</h2>
      <AddAccountForm />
    </main>
  )
}
