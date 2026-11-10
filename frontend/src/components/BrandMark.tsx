
// The app icon (see src/lib/appIcon.tsx) as a small inline logo, rounded for
// in-page use. Keep the two in sync if the icon design changes.
export default function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false" style={{ display: "block", flexShrink: 0 }}>
      <rect width="512" height="512" rx="112" fill="#2c4bd0" />
      <rect x="116" y="164" width="280" height="64" rx="32" fill="#c9d3fb" />
      <rect x="96" y="196" width="320" height="196" rx="52" fill="#ffffff" />
      <rect x="298" y="262" width="118" height="66" rx="33" fill="#e6eafb" />
      <circle cx="336" cy="295" r="15" fill="#2c4bd0" />
    </svg>
  )
}
