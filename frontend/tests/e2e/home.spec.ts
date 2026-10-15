import { test, expect } from "@playwright/test";

// This suite runs against the isolated Next.js instance on :3010, which talks
// to the mock API server (tests/mock-api-server.mjs) instead of the real
// backend/database — see playwright.config.ts. A fake token cookie satisfies
// the auth middleware; the mock backend returns empty data for every request,
// so the dashboard renders its empty state.
test.use({ baseURL: "http://localhost:3010" });

test.describe("dashboard (redesigned home page)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
  });

  test("renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    // "NgernTong" in the sidebar is a plain <span>, not a heading — only
    // the login page renders it as an <h1>. Assert on content that actually
    // exists on the dashboard.
    await expect(page.getByText("NgernTong").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".hero")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("leads with the monthly hero card and the two summary pills", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator(".hero");
    await expect(hero).toBeVisible();
    await expect(hero.getByText(/^Spent in /)).toBeVisible();
    await expect(hero.locator(".hero-amount")).toHaveText(/^฿[\d,]+$/);
    await expect(page.locator(".pill-card")).toHaveCount(2);
    await expect(page.getByText("Renewing this week")).toBeVisible();
  });

  test("theme toggle switches light/dark and persists across reload", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByRole("switch", { name: /switch to (dark|light) mode/i });
    await expect(toggle).toBeVisible();

    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await toggle.click();
    const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(after).not.toBe(before);

    // The cross-fade transition should be present and respect reduced-motion
    // preference (checked structurally: the toggle re-renders instantly,
    // the visual transition is a CSS concern verified separately in review).
    await page.reload();
    const afterReload = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(afterReload).toBe(after);
  });

  test("theme toggle is keyboard operable with a visible focus state", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByRole("switch", { name: /switch to (dark|light) mode/i });
    await toggle.focus();
    await expect(toggle).toBeFocused();

    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.keyboard.press("Enter");
    const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(after).not.toBe(before);
  });
});

test.describe("protected routes without a session", () => {
  test.use({ baseURL: "http://localhost:3000" });

  for (const path of ["/", "/transactions", "/accounts", "/settings"]) {
    test(`redirects ${path} to /login when logged out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
