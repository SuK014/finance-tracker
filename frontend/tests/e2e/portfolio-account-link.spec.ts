import { test, expect } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts).
// Fixture: account "Kasikorn" (THB), holding 2 shares of APP, $1 = ฿30, APP at $260.
test.use({ baseURL: "http://localhost:3010" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

function capture(page: import("@playwright/test").Page, urlEnd: string) {
  const bodies: Record<string, unknown>[] = [];
  page.on("request", r => {
    if (r.method() === "POST" && r.url().endsWith(urlEnd)) bodies.push(r.postDataJSON());
  });
  return bodies;
}

test.describe("linking portfolio trades to an account", () => {
  test("selling shows what will be added to the account and sends the account", async ({ page }) => {
    const sells = capture(page, "/api/portfolio/sell");
    await page.goto("/portfolio");

    await page.getByRole("button", { name: "Sell", exact: true }).click();
    // The price is prefilled with today's price ($260).
    await expect(page.getByRole("spinbutton", { name: "Sell price" })).toHaveValue("260");
    await page.getByRole("spinbutton", { name: "Quantity to sell" }).fill("1");

    await page.getByRole("button", { name: "Deposit to account" }).click();
    await page.getByRole("option", { name: /Kasikorn/ }).click();
    // 1 share x $260 x 30 = ฿7,800
    await expect(page.getByRole("status").filter({ hasText: "Adds about" })).toContainText("฿7,800.00");

    await page.getByRole("button", { name: "Confirm" }).click();
    await expect.poll(() => sells.length).toBe(1);
    expect(sells[0]).toMatchObject({ symbol: "APP", quantity: 1, price: 260, accountId: 1 });
  });

  test("selling without an account sends no account", async ({ page }) => {
    const sells = capture(page, "/api/portfolio/sell");
    await page.goto("/portfolio");
    await page.getByRole("button", { name: "Sell", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Quantity to sell" }).fill("1");
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect.poll(() => sells.length).toBe(1);
    expect(sells[0]).not.toHaveProperty("accountId");
  });

  test("selling more than you hold shows a clear message and sends nothing", async ({ page }) => {
    const sells = capture(page, "/api/portfolio/sell");
    await page.goto("/portfolio");
    await page.getByRole("button", { name: "Sell", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Quantity to sell" }).fill("5");
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "You only hold" })).toBeVisible();
    expect(sells).toHaveLength(0);
  });

  test("buying shows what will leave the account and sends the account", async ({ page }) => {
    const buys = capture(page, "/api/portfolio");
    await page.goto("/portfolio");

    await page.getByRole("button", { name: "Stock", exact: true }).click();
    await page.getByPlaceholder("Symbol (e.g. AAPL)").fill("APP");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByText("Applovin Corporation")).toBeVisible();

    // Amount is entered in THB by default: ฿7,800 = $260 = exactly 1 share.
    await page.getByPlaceholder("Amount in THB").fill("7800");
    await page.getByRole("button", { name: "Pay from account" }).click();
    await page.getByRole("option", { name: /Kasikorn/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Takes about" })).toContainText("฿7,800.00");

    await page.getByRole("button", { name: "Add to Portfolio" }).click();
    await expect.poll(() => buys.length).toBe(1);
    expect(buys[0]).toMatchObject({ symbol: "APP", accountId: 1 });
    expect(Number(buys[0].quantity)).toBeCloseTo(1, 6);
  });
});
