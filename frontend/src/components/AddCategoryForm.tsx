"use client"

import { useState } from "react"
import { createCategory } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function AddCategoryForm() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", color: "#6366f1", type: "expense" })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await createCategory({ name: form.name, color: form.color, type: form.type })
    setForm({ name: "", color: "#6366f1", type: "expense" })
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <div style={{ display: "flex", gap: "0", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", width: "fit-content" }}>
        {["expense", "income"].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setForm({ ...form, type: t })}
            style={{
              border: "none", borderRadius: 0, padding: "5px 14px",
              background: form.type === t ? (t === "expense" ? "var(--expense)" : "var(--income)") : "transparent",
              color: form.type === t ? "#fff" : "var(--text-secondary)",
              borderLeft: t === "income" ? "1px solid var(--border)" : "none",
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder={`Category name (e.g. ${form.type === "expense" ? "Food, Transport" : "Salary, Freelance"})`}
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        required
      />
      <div className="flex items-center gap-2">
        <label>Color</label>
        <input
          type="color"
          value={form.color}
          onChange={e => setForm({ ...form, color: e.target.value })}
        />
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{form.color}</span>
      </div>
      <button type="submit">Add Category</button>
    </form>
  )
}
