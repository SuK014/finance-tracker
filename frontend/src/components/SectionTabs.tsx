"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const GROUPS = {
  activity: [
    { href: "/transactions", label: "Transactions" },
    { href: "/subscriptions", label: "Subscriptions" },
  ],
  wealth: [
    { href: "/net-worth", label: "Net worth" },
    { href: "/accounts", label: "Accounts" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/goals", label: "Goals" },
    { href: "/salary", label: "Salary" },
  ],
} as const

export default function SectionTabs({ group }: { group: keyof typeof GROUPS }) {
  const pathname = usePathname()
  return (
    <nav className="section-tabs" aria-label={group === "activity" ? "Activity sections" : "Wealth sections"}>
      {GROUPS[group].map(t => (
        <Link key={t.href} href={t.href} className="section-tab" aria-current={pathname.startsWith(t.href) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
