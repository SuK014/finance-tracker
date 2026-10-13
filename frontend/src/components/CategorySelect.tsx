"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createCategory } from "@/lib/api"
import Select from "@/components/Select"

type Category = { id: number; name: string; color?: string | null; type?: string }

const ADD_NEW = "__add_new__"

export default function CategorySelect({
  categories,
  type,
  value,
  onChange,
  required,
}: {
  categories: Category[]
  type: string
  value: string
  onChange: (id: string) => void
  required?: boolean
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [color, setColor] = useState("#3b62e0")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = categories.filter(c => !c.type || c.type === type)

  async function handleAdd(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name.trim()) return
    setError(null)
    setSaving(true)
    try {
      const result = await createCategory({ name, color, type })
      if (result?.error) { setError(result.error); return }
      onChange(String(result.id))
      setAdding(false)
      setName("")
      setColor("#3b62e0")
      router.refresh()
    } catch {
      setError("Failed to add category. Is the server running?")
    } finally {
      setSaving(false)
    }
  }

  if (adding) {
    // A plain div, not a <form> — every caller already renders this inside
    // its own <form>, and nested <form> elements are invalid HTML (and
    // cause submit-bubbling bugs). Enter-to-submit is wired manually below.
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            style={{ flexShrink: 0, width: "38px", padding: "2px" }}
            aria-label="Category color"
          />
          <input
            type="text"
            placeholder="New category name"
            required
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); handleAdd() }
              if (e.key === "Escape") { setAdding(false); setError(null); setName("") }
            }}
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button type="button" onClick={() => handleAdd()} disabled={saving} style={{ flex: 1 }}>
            {saving ? "Adding…" : "Add category"}
          </button>
          <button type="button" onClick={() => { setAdding(false); setError(null); setName("") }}>
            Cancel
          </button>
        </div>
        {error && <span style={{ color: "var(--expense)", fontSize: "12px" }}>{error}</span>}
      </div>
    )
  }

  return (
    <Select
      ariaLabel="Category"
      value={value}
      onChange={v => {
        if (v === ADD_NEW) { setAdding(true); return }
        onChange(v)
      }}
      options={[
        ...(!required ? [{ value: "", label: "No category" }] : []),
        ...filtered.map(c => ({ value: String(c.id), label: c.name })),
        { value: ADD_NEW, label: "+ Add new category…" },
      ]}
    />
  )
}
