import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Isolated instance for authenticated-page tests: its own port, its own
      // mock backend (see mock-api-server.mjs) — never the real DB, and
      // reuseExistingServer:false so it can never silently pick up a real
      // dev server someone already has running.
      command: "node tests/mock-api-server.mjs",
      url: "http://localhost:3055",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run dev -- -p 3010",
      url: "http://localhost:3010",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:3055",
        PORT: "3010",
        NEXT_DIST_DIR: ".next-test",
      },
    },
  ],
});
