"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, TransactionsIcon, AccountsIcon, MoreIcon } from "@/components/TabIcons"

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon, isActive: (p: string) => p === "/" },
  { href: "/transactions/new", label: "Transactions", Icon: TransactionsIcon, isActive: (p: string) => p.startsWith("/transactions") },
  { href: "/accounts", label: "Accounts", Icon: AccountsIcon, isActive: (p: string) => p.startsWith("/accounts") },
  { href: "/more", label: "More", Icon: MoreIcon, isActive: (p: string) => p.startsWith("/more") },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="bottom-tab-bar" aria-label="Primary">
      {TABS.map(({ href, label, Icon, isActive }) => {
        const active = isActive(pathname)
        return (
          <Link
            key={href}
            href={href}
            className="bottom-tab-item"
            aria-current={active ? "page" : undefined}
            style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
