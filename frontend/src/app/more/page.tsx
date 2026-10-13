import Link from "next/link"
import ThemeToggle from "@/components/ThemeToggle"
import LogoutButton from "@/components/LogoutButton"

const MORE_LINKS = [
  { href: "/categories", label: "Categories", hint: "Icons, colours and budgets" },
  { href: "/import", label: "Import", hint: "Read transactions from slips" },
  { href: "/settings", label: "Settings", hint: "Password and preferences" },
]

export default function MorePage() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "480px" }}>
      <h1 style={{ margin: 0 }}>Menu</h1>

      <nav style={{ display: "flex", flexDirection: "column" }}>
        {MORE_LINKS.map(({ href, label, hint }) => (
          <Link key={href} href={href} className="row-card more-link">
            <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700 }}>{label}</span>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{hint}</span>
            </span>
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
