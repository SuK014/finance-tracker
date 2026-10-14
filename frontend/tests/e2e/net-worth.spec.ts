import { test, expect } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts).
// Fixture: Kasikorn ฿1,000, and 2 shares of APP worth $520, at $1 = ฿30.
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

    // ฿1,000 + $520 x 30 = ฿16,600
    await expect(page.getByTestId("combined-net-worth")).toContainText("฿16,600.00");
    expect(errors).toEqual([]);
  });
});
