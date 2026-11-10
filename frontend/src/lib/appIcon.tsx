import { ImageResponse } from "next/og";

// Wallet app icon on the flat ink-blue accent (--hero-from in globals.css)
// with a pale flap. Full-bleed square on purpose:
// iOS and Android apply their own rounded mask, and the wallet sits well
// inside the central 80% "safe zone" so it survives that crop.
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="#c2570c" />
        <rect x="116" y="164" width="280" height="64" rx="32" fill="#f3c9a6" />
        <rect x="96" y="196" width="320" height="196" rx="52" fill="#ffffff" />
        <rect x="298" y="262" width="118" height="66" rx="33" fill="#f8e4d2" />
        <circle cx="336" cy="295" r="15" fill="#c2570c" />
      </svg>
    ),
    { width: size, height: size }
  );
}
