import { test, expect } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts).
// Fixture: Kasikorn ฿1,000, a matured bond worth ฿10,250.68, and 2 shares of APP worth $520, at $1 = ฿30.
test.use({ baseURL: "http://localhost:3010" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

test.describe("net worth", () => {
  test("includes the portfolio holdings and a combined total in baht", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/net-worth");

    const usd = page.locator("div", { has: page.getByRole("heading", { name: "USD", exact: true }) }).last();
    await expect(usd.getByRole("heading", { name: "Portfolio" })).toBeVisible();
    await expect(usd).toContainText("APP");
    await expect(usd).toContainText("$520.00");
    await expect(usd).toContainText("Total USD");

    // ฿1,000 + ฿10,250.68 (bond) + $520 x 30 = ฿26,850.68
    await expect(page.getByTestId("combined-net-worth")).toContainText("฿26,850.68");

    const thb = page.locator("div", { has: page.getByRole("heading", { name: "THB", exact: true }) }).last();
    await expect(thb).toContainText("Savings bond 2020");
    await expect(thb).toContainText("฿10,250.68");
    expect(errors).toEqual([]);
  });
});
