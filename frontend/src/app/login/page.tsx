"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { login, register, saveToken } from "@/lib/api"
import ThemeToggle from "@/components/ThemeToggle"
import BrandMark from "@/components/BrandMark"

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const loginTabRef = useRef<HTMLButtonElement>(null)
  const registerTabRef = useRef<HTMLButtonElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const el = mode === "login" ? loginTabRef.current : registerTabRef.current
    if (!el) return
    function place() {
      if (!el) return
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [mode])

  function switchMode(next: "login" | "register") {
    setMode(next)
    setError("")
  }

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
    <div className="login-page">
      <section className="login-cover" aria-hidden="true">
        <div className="login-mark">
          <BrandMark size={28} />
          Finance Tracker
        </div>

        <div className="login-cover-body">
          <div className="login-figure">
            <p className="login-figure-label">Net worth</p>
            <p className="login-figure-value num">
              <span className="cur">฿</span>128,430.55
            </p>
            <svg
              className="login-spark"
              viewBox="0 0 320 64"
              preserveAspectRatio="none"
              role="img"
              aria-label="Net worth trend, past 6 months, trending upward"
            >
              <defs>
                <linearGradient id="loginSparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3fc98a" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3fc98a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,46 L45,50 L90,34 L135,40 L180,22 L225,26 L270,10 L320,14 L320,64 L0,64 Z"
                fill="url(#loginSparkFill)"
              />
              <path
                d="M0,46 L45,50 L90,34 L135,40 L180,22 L225,26 L270,10 L320,14"
                fill="none"
                stroke="#3fc98a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="320" cy="14" r="3.5" fill="#3fc98a" />
            </svg>
          </div>

          <div>
            <div className="login-cover-stats">
              <div>
                <p className="stat-label">Income (Sep)</p>
                <p className="stat-value num" data-tone="income">+฿42,100</p>
              </div>
              <div>
                <p className="stat-label">Expenses (Sep)</p>
                <p className="stat-value num" data-tone="expense">&minus;฿27,860</p>
              </div>
              <div>
                <p className="stat-label">Savings rate</p>
                <p className="stat-value num">34%</p>
              </div>
            </div>
            <p className="login-cover-foot">Every baht in one ledger — accounts, categories, and holdings, kept in sync.</p>
          </div>
        </div>
      </section>

      <section className="login-auth-panel">
        <div className="login-theme-toggle">
          <ThemeToggle />
        </div>

        <div className="login-card">
          <div className="login-brand">Finance Tracker</div>
          <div className="login-head">
            <h1>{mode === "login" ? "Sign in to your account" : "Create your account"}</h1>
            <p>{mode === "login" ? "Pick up where you left off." : "Takes less than a minute."}</p>
          </div>

          <div className="login-tabs">
            <button
              ref={loginTabRef}
              type="button"
              className="login-tab"
              aria-pressed={mode === "login"}
              onClick={() => switchMode("login")}
            >
              Login
            </button>
            <button
              ref={registerTabRef}
              type="button"
              className="login-tab"
              aria-pressed={mode === "register"}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
            <span
              className="login-tab-indicator"
              style={{ transform: `translateX(${indicator.left}px) scaleX(${indicator.width})` }}
            />
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email" placeholder="you@example.com" required autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-pw-row">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters" required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            {mode === "register" && (
              <div className="login-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password" required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
            {error && <p className="login-field-error">{error}</p>}
            <button type="submit" disabled={loading} style={{ marginTop: "4px" }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="login-switch-line">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
