"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateAccount, deleteAccount } from "@/lib/api"
import DeleteButton from "@/components/DeleteButton"
import RowActionsMenu from "@/components/RowActionsMenu"

type Account = { id: number; name: string; type: string; bankName?: string | null; currency: string }

export default function AccountActions({ account }: { account: Account }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: account.name, type: account.type, bankName: account.bankName ?? "", currency: account.currency })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const result = await updateAccount(account.id, form)
      if (result?.error) { setError(result.error); return }
      setEditing(false)
      router.refresh()
    } catch {
      setError("Failed to save. Is the server running?")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleEdit} style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" placeholder="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: "120px" }} />
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          <option value="bank">Bank</option>
          <option value="wallet">Wallet</option>
          <option value="credit_card">Credit Card</option>
        </select>
        <input type="text" placeholder="Bank name" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} style={{ width: "100px" }} />
        {error && <span style={{ color: "var(--expense)", fontSize: "12px" }}>{error}</span>}
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => { setEditing(false); setError(null) }}>Cancel</button>
      </form>
    )
  }

  async function handleMenuDelete() {
    if (!confirm("Delete this account? All its transactions will also be deleted.")) return
    await deleteAccount(account.id)
    router.refresh()
  }

  return (
    <>
      <span className="row-actions-inline">
        <button type="button" onClick={() => setEditing(true)}>Edit</button>
        <DeleteButton id={account.id} type="account" />
      </span>
      <span className="row-actions-menu">
        <RowActionsMenu
          actions={[
            { label: "Edit", onClick: () => setEditing(true) },
            { label: "Delete", onClick: handleMenuDelete, danger: true },
          ]}
        />
      </span>
    </>
  )
}
