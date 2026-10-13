import { ImageResponse } from "next/og";

// Wallet app icon on the Soft Pastel lilac gradient (--hero-from / --hero-to
// in globals.css) with a peach flap (--peach). Full-bleed square on purpose:
// iOS and Android apply their own rounded mask, and the wallet sits well
// inside the central 80% "safe zone" so it survives that crop.
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5a4bd0" />
            <stop offset="1" stopColor="#8b7df5" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" fill="url(#bg)" />
        <rect x="116" y="164" width="280" height="64" rx="32" fill="#FFB59E" />
        <rect x="96" y="196" width="320" height="196" rx="52" fill="#ffffff" />
        <rect x="298" y="262" width="118" height="66" rx="33" fill="#ECE9FF" />
        <circle cx="336" cy="295" r="15" fill="#6a5ae0" />
      </svg>
    ),
    { width: size, height: size }
  );
}
