// Line icons for the small decorations that used to be emoji. One set: 18px, 1.5 stroke, round caps, currentColor,
// so they take the text colour of whatever they sit in. (The bottom tab bar has its own larger set in TabIcons.)
type IconProps = { size?: number }

function Svg({ size = 18, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="icon"
    >
      {children}
    </svg>
  )
}

export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
export const CameraIcon = (p: IconProps) => <Svg {...p}><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-2h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="13" r="3.25" /></Svg>
export const PaperclipIcon = (p: IconProps) => <Svg {...p}><path d="m20 11-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.5 16.5a1.6 1.6 0 0 1-2.3-2.3L15 6.5" /></Svg>
export const ReceiptIcon = (p: IconProps) => <Svg {...p}><path d="M6 3.5h12v17l-2.4-1.6-2.1 1.6-1.5-1.6-1.5 1.6-2.1-1.6L6 20.5Z" /><path d="M9 8.5h6M9 12h6" /></Svg>
export const TargetIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r=".6" fill="currentColor" /></Svg>
export const TvIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="6" width="17" height="11.5" rx="2" /><path d="M9 20.5h6" /></Svg>
export const TrendIcon = (p: IconProps) => <Svg {...p}><path d="m4 16 5-5 3.5 3.5L20 7" /><path d="M15 7h5v5" /></Svg>
export const MicIcon = (p: IconProps) => <Svg {...p}><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" /></Svg>
export const StopIcon = (p: IconProps) => <Svg {...p}><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /></Svg>
export const EyeIcon = (p: IconProps) => <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" /></Svg>
export const EyeOffIcon = (p: IconProps) => <Svg {...p}><path d="M4 4l16 16" /><path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.4 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.8" /><path d="M10 10a2.75 2.75 0 0 0 3.9 3.9" /></Svg>
export const MoonIcon = (p: IconProps) => <Svg {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></Svg>
export const SunIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3.75" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></Svg>
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
