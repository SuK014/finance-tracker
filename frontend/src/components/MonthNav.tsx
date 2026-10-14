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

  const chevron = (dir: "left" | "right") => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={dir === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <button type="button" className="month-btn" onClick={prev} aria-label="Previous month">{chevron("left")}</button>
      <span style={{ minWidth: "140px", textAlign: "center", fontWeight: 600 }}>
        {label}
      </span>
      <button type="button" className="month-btn" onClick={next} disabled={isCurrent} aria-label="Next month">{chevron("right")}</button>
    </div>
  )
}
