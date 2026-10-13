"use client"

import { useRouter } from "next/navigation"

export default function MonthNav({
  year,
  month,
  basePath = "/",
}: {
  year: number
  month: number
  basePath?: string
}) {
  const router = useRouter()

  function go(y: number, m: number) {
    const monthStr = `${y}-${String(m).padStart(2, "0")}`
    const sep = basePath.includes("?") ? "&" : "?"
    router.push(`${basePath}${sep}month=${monthStr}`)
  }

  function prev() {
    if (month === 1) go(year - 1, 12)
    else go(year, month - 1)
  }

  function next() {
    if (month === 12) go(year + 1, 1)
    else go(year, month + 1)
  }

  const now = new Date()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month
  const label = new Date(year, month - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })

  const btnStyle: React.CSSProperties = {
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "4px 10px",
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontSize: "14px",
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <button onClick={prev} style={btnStyle}>‹</button>
      <span style={{ minWidth: "140px", textAlign: "center", fontWeight: 600 }}>
        {label}
      </span>
      <button onClick={next} disabled={isCurrent} style={{ ...btnStyle, opacity: isCurrent ? 0.3 : 1 }}>›</button>
    </div>
  )
}
