type IconProps = { size?: number }

// One consistent stroke system for the bottom tab bar: 1.75px, round caps/joins,
// currentColor so active/inactive state is just a color change on the parent Link.
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function HomeIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-5.5h2V20h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function TransactionsIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M9 10h6M9 13.5h6M9 17h3.5" />
    </svg>
  )
}

export function AccountsIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10.5h17" />
      <path d="M15.5 14.5h2.5" />
    </svg>
  )
}

export function MoreIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} fill="currentColor" stroke="none">
      <circle cx="6" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="18" cy="12" r="1.75" />
    </svg>
  )
}

export function ActivityIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M4 7h11M4 12h16M4 17h8" />
      <circle cx="19" cy="7" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ReportsIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M5 20V11M12 20V4M19 20v-6" />
    </svg>
  )
}

export function WealthIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M3.5 17 9 11.5l3.5 3.5 8-8.5" />
      <path d="M15 6.5h5.5V12" />
    </svg>
  )
}

export function PlusIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.5}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function UserIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </svg>
  )
}
