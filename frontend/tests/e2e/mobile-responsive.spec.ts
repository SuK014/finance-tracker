import { test, expect, type Page } from "@playwright/test";

// See home.spec.ts for why this runs against the isolated :3010 instance
// backed by the mock API server rather than the real database.
test.use({ baseURL: "http://localhost:3010" });

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

test.describe("mobile responsiveness (390px)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("dashboard has no horizontal overflow and stacks its two-column section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".stat-tile").first()).toBeVisible();

    expect(await hasHorizontalOverflow(page)).toBe(false);

    // The "Spending by Category" / "Recent Transactions" section must stack
    // to one column, not squeeze into two, at this width.
    const grid = page.locator(".two-col-grid").first();
    const box = await grid.boundingBox();
    const firstChildBox = await grid.locator("> *").first().boundingBox();
    expect(firstChildBox?.width).toBeGreaterThan((box?.width ?? 0) * 0.9);
  });

  test("transaction row has no horizontal overflow and shows the overflow menu instead of inline actions", async ({ page }) => {
    await page.goto("/transactions?month=2026-09");

    await expect(page.getByText("Whole Foods")).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    const row = page.locator(".row-card", { hasText: "Whole Foods" });
    await expect(row.locator(".row-actions-menu")).toBeVisible();
    await expect(row.locator(".row-actions-inline")).not.toBeVisible();
  });

  test("overflow menu is keyboard operable and exposes Edit/Delete", async ({ page }) => {
    await page.goto("/transactions?month=2026-09");
    await expect(page.getByText("Whole Foods")).toBeVisible();

    const trigger = page.getByRole("button", { name: "More actions" });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeHidden();
  });
});

test.describe("desktop (1280px) keeps inline actions", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("shows inline Edit/Delete, not the overflow menu", async ({ page, context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
    await page.goto("/transactions?month=2026-09");
    await expect(page.getByText("Whole Foods")).toBeVisible();

    const row = page.locator(".row-card", { hasText: "Whole Foods" });
    await expect(row.locator(".row-actions-inline")).toBeVisible();
    await expect(row.locator(".row-actions-menu")).not.toBeVisible();
  });
});
