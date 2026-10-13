"use client"

import { useState } from "react"
import { changePassword } from "@/lib/api"

export default function SettingsPage() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (form.next !== form.confirm) {
      setError("New passwords don't match.")
      return
    }
    if (form.next.length < 6) {
      setError("New password must be at least 6 characters.")
      return
    }
    setSaving(true)
    try {
      const res = await changePassword(form.current, form.next)
      if (res.error) { setError(res.error); return }
      setSuccess(true)
      setForm({ current: "", next: "", confirm: "" })
    } catch {
      setError("Could not reach the server.")
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box" }

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "420px" }}>
      <h1 style={{ margin: 0 }}>Settings</h1>

      <section style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "24px",
        display: "flex", flexDirection: "column", gap: "16px",
      }}>
        <h2 style={{ margin: 0, fontSize: "15px" }}>Change Password</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Current password</label>
            <input
              type="password" required style={inputStyle}
              value={form.current}
              onChange={e => setForm({ ...form, current: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>New password</label>
            <input
              type="password" required minLength={6} style={inputStyle}
              value={form.next}
              onChange={e => setForm({ ...form, next: e.target.value })}
              autoComplete="new-password"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Confirm new password</label>
            <input
              type="password" required style={inputStyle}
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "13px", color: "var(--expense)" }}>{error}</p>
          )}
          {success && (
            <p style={{ margin: 0, fontSize: "13px", color: "var(--income)" }}>Password changed successfully.</p>
          )}

          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>
    </main>
  )
}
