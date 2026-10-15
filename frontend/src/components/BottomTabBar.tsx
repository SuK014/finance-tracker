"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, ActivityIcon, ReportsIcon, WealthIcon, PlusIcon } from "@/components/TabIcons"
import { useAddSheet } from "@/components/AddSheet"

const LEFT = [
  { href: "/", label: "Home", Icon: HomeIcon, isActive: (p: string) => p === "/" },
  { href: "/transactions", label: "Activity", Icon: ActivityIcon, isActive: (p: string) => p.startsWith("/transactions") || p.startsWith("/subscriptions") },
]
const RIGHT = [
  { href: "/reports", label: "Reports", Icon: ReportsIcon, isActive: (p: string) => p.startsWith("/reports") },
  { href: "/net-worth", label: "Wealth", Icon: WealthIcon, isActive: (p: string) => p.startsWith("/net-worth") || p.startsWith("/accounts") || p.startsWith("/portfolio") || p.startsWith("/goals") || p.startsWith("/salary") },
]

export default function BottomTabBar() {
  const pathname = usePathname()
  const { open } = useAddSheet()

  function renderTab({ href, label, Icon, isActive }: (typeof LEFT)[number]) {
    const active = isActive(pathname)
    return (
      <Link
        key={href}
        href={href}
        className="bottom-tab-item"
        aria-current={active ? "page" : undefined}
        style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
      >
        <Icon />
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <nav className="bottom-tab-bar" aria-label="Primary">
      {LEFT.map(renderTab)}
      <div className="bottom-tab-fab-slot">
        <button type="button" className="fab" onClick={open} aria-label="Add transaction">
          <PlusIcon />
        </button>
      </div>
      {RIGHT.map(renderTab)}
    </nav>
  )
}
