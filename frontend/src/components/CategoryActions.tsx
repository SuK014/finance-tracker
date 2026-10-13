"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateCategory, deleteCategory } from "@/lib/api"
import DeleteButton from "@/components/DeleteButton"
import RowActionsMenu from "@/components/RowActionsMenu"
import EmojiPicker from "@/components/EmojiPicker"

type Category = { id: number; name: string; color?: string | null; icon?: string | null; type?: string; budget?: number | null }

export default function CategoryActions({ category }: { category: Category }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: category.name,
    color: category.color ?? "#6a5ae0",
    icon: category.icon ?? "",
    type: category.type ?? "expense",
    budget: category.budget != null ? String(category.budget) : "",
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const result = await updateCategory(category.id, {
        name: form.name,
        color: form.color,
        icon: form.icon || null,
        type: form.type,
        budget: form.budget ? Number(form.budget) : null,
      })
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
      <form onSubmit={handleEdit} style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          {["expense", "income"].map(t => (
            <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} style={{
              border: "none", borderRadius: 0, padding: "4px 10px", fontSize: "12px",
              background: form.type === t ? (t === "expense" ? "var(--expense)" : "var(--income)") : "transparent",
              color: form.type === t ? "#fff" : "var(--text-secondary)",
              borderLeft: t === "income" ? "1px solid var(--border)" : "none",
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ flexBasis: "100%" }}><EmojiPicker value={form.icon} onChange={icon => setForm({ ...form, icon })} /></div>
        <input type="text" placeholder="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: "120px" }} />
        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
        <input type="number" placeholder="Budget ฿ (optional)" min="0" step="any" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} style={{ width: "130px" }} />
        {error && <span style={{ color: "var(--expense)", fontSize: "12px" }}>{error}</span>}
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => { setEditing(false); setError(null) }}>Cancel</button>
      </form>
    )
  }

  async function handleMenuDelete() {
    if (!confirm("Delete this category?")) return
    await deleteCategory(category.id)
    router.refresh()
  }

  return (
    <>
      <span className="row-actions-inline">
        <button type="button" onClick={() => setEditing(true)}>Edit</button>
        <DeleteButton id={category.id} type="category" />
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
