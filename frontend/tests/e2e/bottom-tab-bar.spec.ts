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

  test("shows 4 tabs around a centre add button instead of the sidebar", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toBeVisible();
    for (const name of ["Home", "Activity", "Reports", "Wealth"]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
    await expect(nav.getByRole("button", { name: "Add transaction" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden();
  });

  test("marks the current section's tab active via aria-current", async ({ page }) => {
    await page.goto("/accounts");

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Wealth" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
  });

  test("Activity and Wealth pages expose their sub-sections as tabs", async ({ page }) => {
    await page.goto("/transactions");
    const activity = page.getByRole("navigation", { name: "Activity sections" });
    await expect(activity.getByRole("link", { name: "Transactions" })).toHaveAttribute("aria-current", "page");
    await activity.getByRole("link", { name: "Subscriptions" }).click();
    await expect(page).toHaveURL(/\/subscriptions$/);

    await page.goto("/net-worth");
    const wealth = page.getByRole("navigation", { name: "Wealth sections" });
    for (const name of ["Net worth", "Accounts", "Portfolio"]) {
      await expect(wealth.getByRole("link", { name })).toBeVisible();
    }
  });

  test("profile button opens a menu with categories, import, settings, appearance and logout", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Menu and settings" }).click();

    await expect(page).toHaveURL(/\/more$/);
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: /Categories/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /Import/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /Settings/ })).toBeVisible();
    await expect(main.getByText("Appearance")).toBeVisible();
    await expect(main.getByRole("button", { name: "Logout" })).toBeVisible();
  });
});

test.describe("desktop (1280px) keeps the sidebar", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("shows the sidebar instead of the tab bar", async ({ page, context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
    await page.goto("/");

    const sections = page.getByRole("navigation", { name: "Sections" });
    await expect(sections.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "Net worth" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Add transaction" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  });
});
