import Link from "next/link"
import ThemeToggle from "@/components/ThemeToggle"
import LogoutButton from "@/components/LogoutButton"

const MORE_LINKS = [
  { href: "/categories", label: "Categories" },
  { href: "/recurring", label: "Recurring" },
  { href: "/reports", label: "Reports" },
  { href: "/net-worth", label: "Net Worth" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
]

export default function MorePage() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "420px" }}>
      <h1 style={{ margin: 0 }}>More</h1>

      <nav style={{ display: "flex", flexDirection: "column" }}>
        {MORE_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className="row-card more-link">
            <span style={{ flex: 1 }}>{label}</span>
            <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>›</span>
          </Link>
        ))}
      </nav>

      <section style={{
        display: "flex", flexDirection: "column", gap: "16px",
        paddingTop: "8px", borderTop: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Appearance</span>
          <ThemeToggle />
        </div>
        <LogoutButton />
      </section>
    </main>
  )
}
