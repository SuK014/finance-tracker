"use client"

import { useState } from "react"
import { SERVICES, findService } from "@/lib/services"
import { ServiceIcon } from "@/components/ServiceIcon"

const INITIAL = 11

// Quick-pick for popular services. Choosing one fills the name, and the logo is
// then shown wherever that name appears; anything else can just be typed.
export default function ServicePicker({
  description,
  onPick,
}: {
  description: string
  onPick: (name: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const current = findService(description)?.id
  const currentIndex = SERVICES.findIndex(s => s.id === current)
  const expanded = showAll || currentIndex >= INITIAL
  const visible = expanded ? SERVICES : SERVICES.slice(0, INITIAL)

  return (
    <div role="group" aria-label="Popular services" className="svc-grid">
      {visible.map(s => (
        <button
          key={s.id}
          type="button"
          className="svc-btn"
          aria-pressed={current === s.id}
          onClick={() => onPick(current === s.id ? "" : s.name)}
        >
          <ServiceIcon service={s} />
          <span>{s.name}</span>
        </button>
      ))}
      {!expanded && (
        <button type="button" className="svc-btn svc-more" onClick={() => setShowAll(true)}>
          <span className="cat-icon" aria-hidden="true">＋</span>
          <span>Show all {SERVICES.length}</span>
        </button>
      )}
    </div>
  )
}
