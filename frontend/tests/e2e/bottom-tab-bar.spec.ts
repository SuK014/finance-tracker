import { test, expect } from "@playwright/test";

// See home.spec.ts for why this runs against the isolated :3010 instance
// backed by the mock API server rather than the real database.
test.use({ baseURL: "http://localhost:3010" });

test.describe("bottom tab bar (390px)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("shows the tab bar instead of the sidebar", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Transactions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Accounts" })).toBeVisible();
    await expect(page.getByRole("link", { name: "More" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeHidden();
  });

  test("marks the current section's tab active via aria-current", async ({ page }) => {
    await page.goto("/accounts");

    await expect(page.getByRole("link", { name: "Accounts" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
  });

  test("More tab opens a page listing the remaining sections plus appearance/logout", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "More" }).click();

    await expect(page).toHaveURL(/\/more$/);
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reports" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Appearance")).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });
});

test.describe("desktop (1280px) keeps the sidebar", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("shows the sidebar instead of the tab bar", async ({ page, context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  });
});
