"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import LogoutButton from "@/components/LogoutButton"
import ThemeToggle from "@/components/ThemeToggle"
import BottomTabBar from "@/components/BottomTabBar"
import { AddSheetProvider, useAddSheet } from "@/components/AddSheet"
import { UserIcon } from "@/components/TabIcons"
import BrandMark from "@/components/BrandMark"

const NAV_GROUPS: Array<{ label?: string; items: Array<{ href: string; label: string; match: (p: string) => boolean }> }> = [
  { items: [{ href: "/", label: "Home", match: p => p === "/" }] },
  {
    label: "Activity",
    items: [
      { href: "/transactions", label: "Transactions", match: p => p.startsWith("/transactions") },
      { href: "/subscriptions", label: "Subscriptions", match: p => p.startsWith("/subscriptions") },
    ],
  },
  { items: [{ href: "/reports", label: "Reports", match: p => p.startsWith("/reports") }] },
  {
    label: "Wealth",
    items: [
      { href: "/net-worth", label: "Net worth", match: p => p.startsWith("/net-worth") },
      { href: "/accounts", label: "Accounts", match: p => p.startsWith("/accounts") },
      { href: "/portfolio", label: "Portfolio", match: p => p.startsWith("/portfolio") },
      { href: "/goals", label: "Goals", match: p => p.startsWith("/goals") },
      { href: "/salary", label: "Salary", match: p => p.startsWith("/salary") },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/categories", label: "Categories", match: p => p.startsWith("/categories") },
      { href: "/import", label: "Import", match: p => p.startsWith("/import") },
      { href: "/settings", label: "Settings", match: p => p.startsWith("/settings") },
    ],
  },
]

function Brand() {
  return (
    <span className="brand">
      <BrandMark size={32} />
      Finance Tracker
    </span>
  )
}

function Sidebar({ pathname }: { pathname: string }) {
  const { open } = useAddSheet()
  return (
    <aside className="sidebar">
      <Brand />
      <button type="button" className="sidebar-add" onClick={open}>+ Add transaction</button>
      <nav aria-label="Sections" style={{ display: "contents" }}>
        {NAV_GROUPS.map((g, i) => (
          <div key={i} style={{ display: "contents" }}>
            {g.label && <span className="nav-group-label">{g.label}</span>}
            {g.items.map(n => (
              <Link key={n.href} href={n.href} className="nav-link" aria-current={n.match(pathname) ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="sidebar-foot-row">
          <span>Appearance</span>
          <ThemeToggle />
        </div>
        <LogoutButton />
      </div>
    </aside>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/login") return <>{children}</>

  return (
    <AddSheetProvider>
      <div className="app-shell">
        <Sidebar pathname={pathname} />
        <div className="app-main-col">
          <div className="mobile-header">
            <Brand />
            <ThemeToggle />
            <Link href="/more" className="profile-link" aria-label="Menu and settings">
              <UserIcon size={22} />
            </Link>
          </div>
          <div className="app-content">
            <div className="page-wrap">{children}</div>
          </div>
        </div>
        <BottomTabBar />
      </div>
    </AddSheetProvider>
  )
}
