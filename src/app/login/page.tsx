"use client"

import { useState } from "react"
import { login, register, saveToken } from "@/lib/api"

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    const fn = mode === "login" ? login : register
    const result = await fn(email, password)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    saveToken(result.token!)
    window.location.href = "/"
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ width: "340px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px" }}>Finance Tracker</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => { setMode("login"); setError("") }}
            style={{
              flex: 1, borderRadius: 0, border: "none",
              background: mode === "login" ? "var(--accent)" : "transparent",
              color: mode === "login" ? "#fff" : "var(--text-secondary)",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError("") }}
            style={{
              flex: 1, borderRadius: 0, border: "none",
              borderLeft: "1px solid var(--border)",
              background: mode === "register" ? "var(--accent)" : "transparent",
              color: mode === "register" ? "#fff" : "var(--text-secondary)",
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Email</label>
            <input
              type="email" placeholder="you@example.com" required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Password</label>
            <input
              type="password" placeholder="Min. 8 characters" required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Confirm Password</label>
              <input
                type="password" placeholder="Repeat your password" required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          )}
          {error && (
            <p style={{ margin: 0, color: "var(--expense)", fontSize: "13px", background: "color-mix(in srgb, var(--expense) 12%, transparent)", padding: "8px 10px", borderRadius: "var(--radius)", border: "1px solid color-mix(in srgb, var(--expense) 35%, transparent)" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} style={{ marginTop: "4px" }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  )
}
