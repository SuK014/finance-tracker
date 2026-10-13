import CategoryIcon from "@/components/CategoryIcon"
import { findService, type Service } from "@/lib/services"

type Cat = { icon?: string | null; name?: string | null; type?: string | null; color?: string | null }

export function ServiceIcon({ service, size }: { service: Service; size?: "sm" | "lg" }) {
  const mono = service.mono
  return (
    <span
      className="cat-icon service-icon"
      data-size={size}
      aria-hidden="true"
      style={{ background: service.color, color: service.fg }}
    >
      {service.path ? (
        <svg viewBox="0 0 24 24" width="58%" height="58%" fill="currentColor" focusable="false">
          <path d={service.path} />
        </svg>
      ) : (
        <span className="service-mono" data-len={mono?.length ?? 1}>{mono}</span>
      )}
    </span>
  )
}

// Logo of the service named in `description` (Netflix, Spotify…), otherwise the
// category's emoji, otherwise a generic tag.
export default function SubscriptionIcon({
  description,
  category,
  size,
}: {
  description?: string | null
  category?: Cat | null
  size?: "sm" | "lg"
}) {
  const service = findService(description)
  if (service) return <ServiceIcon service={service} size={size} />
  return <CategoryIcon category={category ?? { type: "expense" }} size={size} />
}
