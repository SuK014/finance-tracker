import { useId } from "react"

// The app icon (see src/lib/appIcon.tsx) as a small inline logo, rounded for
// in-page use. Keep the two in sync if the icon design changes.
export default function BrandMark({ size = 32 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false" style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a4bd0" />
          <stop offset="1" stopColor="#8b7df5" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${id})`} />
      <rect x="116" y="164" width="280" height="64" rx="32" fill="#FFB59E" />
      <rect x="96" y="196" width="320" height="196" rx="52" fill="#ffffff" />
      <rect x="298" y="262" width="118" height="66" rx="33" fill="#ECE9FF" />
      <circle cx="336" cy="295" r="15" fill="#6a5ae0" />
    </svg>
  )
}
