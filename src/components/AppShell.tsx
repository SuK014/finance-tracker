"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import LogoutButton from "@/components/LogoutButton"
import ThemeToggle from "@/components/ThemeToggle"

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions/new", label: "Transactions" },
  { href: "/categories", label: "Categories" },
  { href: "/recurring", label: "Recurring" },
  { href: "/reports", label: "Reports" },
  { href: "/net-worth", label: "Net Worth" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname === "/login") return <>{children}</>

  // "Transactions" now links straight to the add-form; keep it highlighted
  // whether you're there or on the list itself (/transactions).
  function isActive(href: string) {
    if (href === "/transactions/new") return pathname.startsWith("/transactions")
    return pathname === href
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile overlay */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            zIndex: 30, display: "none",
          }}
        />
      )}

      <aside className={`sidebar${open ? " sidebar-open" : ""}`} style={{
        width: "224px", flexShrink: 0,
        background: "var(--surface)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", padding: "24px 16px", gap: "4px",
        height: "100vh", overflowY: "auto",
      }}>
        <span style={{ fontWeight: 650, fontSize: "15px", letterSpacing: "-0.01em", padding: "0 8px", marginBottom: "20px" }}>
          Finance Tracker
        </span>
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            style={{
              padding: "8px 10px", borderRadius: "6px", textDecoration: "none",
              fontWeight: isActive(n.href) ? 600 : 400,
              background: isActive(n.href) ? "var(--bg)" : "transparent",
              color: isActive(n.href) ? "var(--accent)" : "var(--text-primary)",
              transition: "background-color 150ms cubic-bezier(0.16, 1, 0.3, 1), color 150ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {n.label}
          </Link>
        ))}
        <div style={{ marginTop: "auto", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Appearance</span>
            <ThemeToggle />
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Mobile header */}
        <div className="mobile-header" style={{
          display: "none", alignItems: "center", gap: "12px",
          padding: "12px 16px", borderBottom: "1px solid var(--border)",
          background: "var(--surface)", flexShrink: 0,
        }}>
          <button
            onClick={() => setOpen(v => !v)}
            style={{ border: "none", background: "none", padding: "4px", fontSize: "20px", lineHeight: 1 }}
          >
            ☰
          </button>
          <span style={{ fontWeight: 650, fontSize: "15px", flex: 1 }}>Finance Tracker</span>
          <ThemeToggle />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
          {children}
        </div>
      </div>
    </div>
  )
}
