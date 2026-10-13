import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "Recurring" was renamed to "Subscriptions"; keep old links and bookmarks working.
  async redirects() {
    return [{ source: "/recurring", destination: "/subscriptions", permanent: false }]
  },
  /* config options here */
  // Lets a second `next dev` instance run from this same directory (used by
  // the isolated Playwright test server on :3010) without colliding with the
  // normal dev server's lock/build cache in .next.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
