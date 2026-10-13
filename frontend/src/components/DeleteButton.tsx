"use client"

import { useRouter } from "next/navigation"
import { deleteAccount, deleteTransaction, deleteLot, deleteCategory } from "@/lib/api"

const CONFIGS = {
  account: {
    fn: deleteAccount,
    message: "Delete this account? All its transactions will also be deleted.",
  },
  transaction: {
    fn: deleteTransaction,
    message: "Delete this transaction?",
  },
  lot: {
    fn: deleteLot,
    message: "Delete this lot?",
  },
  category: {
    fn: deleteCategory,
    message: "Delete this category?",
  },
}

export default function DeleteButton({
  id,
  type,
}: {
  id: number
  type: keyof typeof CONFIGS
}) {
  const router = useRouter()
  const { fn, message } = CONFIGS[type]

  async function handleDelete() {
    if (!confirm(message)) return
    await fn(id)
    router.refresh()
  }

  return (
    <button type="button" onClick={handleDelete} style={{ color: "red", marginLeft: "8px" }}>
      Delete
    </button>
  )
}
