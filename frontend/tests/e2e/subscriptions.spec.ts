import { test, expect } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts), whose
// fixtures hold Netflix (monthly 419), Disney+ (yearly 1,200) and Gym (monthly 300).
test.use({ baseURL: "http://localhost:3010" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

test("lists subscriptions with brand logos and a monthly-equivalent total", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(e.message));

  await page.goto("/subscriptions");
  await expect(page.getByRole("heading", { name: "Subscriptions", exact: true })).toBeVisible();

  // 419 + 1,200/12 + 300 = 819 a month, 9,828 a year.
  const summary = page.getByRole("region", { name: "Subscription cost" });
  await expect(summary).toContainText("฿819");
  await expect(summary).toContainText("฿9,828 a year across 3 subscriptions");

  const netflix = page.locator(".sub-card", { hasText: "Netflix Premium" });
  await expect(netflix).toContainText("Monthly");
  await expect(netflix.locator(".service-icon svg")).toBeVisible(); // real logo glyph

  const disney = page.locator(".sub-card", { hasText: "Disney+" });
  await expect(disney).toContainText("Yearly");
  await expect(disney.locator(".service-icon")).toContainText("D+"); // monogram fallback

  const gym = page.locator(".sub-card", { hasText: "Gym" });
  await expect(gym.locator(".service-icon")).toHaveCount(0); // unknown name falls back to the category icon
  expect(errors).toEqual([]);
});

test("old /recurring links still work", async ({ page }) => {
  await page.goto("/recurring");
  await expect(page).toHaveURL(/\/subscriptions$/);
});

test("picking a service fills the name, and billing can be switched to yearly", async ({ page }) => {
  await page.goto("/subscriptions");
  const name = page.getByRole("textbox", { name: "Subscription name" });

  await page.getByRole("group", { name: "Popular services" }).getByRole("button", { name: "Spotify" }).click();
  await expect(name).toHaveValue("Spotify");
  await expect(page.getByRole("button", { name: "Spotify" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Yearly", exact: true }).click();
  await expect(page.getByRole("button", { name: "Yearly", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Monthly", exact: true })).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("spinbutton", { name: "Price" }).fill("1290");
  await page.getByRole("button", { name: "Add subscription" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
});

test("shows the first services, and Show all reveals the rest", async ({ page }) => {
  await page.goto("/subscriptions");
  const picker = page.getByRole("group", { name: "Popular services" });
  await expect(picker.getByRole("button", { name: "Netflix" })).toBeVisible();
  await expect(picker.getByRole("button", { name: "Canva" })).toHaveCount(0);

  await picker.getByRole("button", { name: /Show all/ }).click();
  await expect(picker.getByRole("button", { name: "Canva" })).toBeVisible();
  await expect(picker.getByRole("button", { name: /Show all/ })).toHaveCount(0);
});

test("asks for a name before saving", async ({ page }) => {
  await page.goto("/subscriptions");
  await page.getByRole("spinbutton", { name: "Price" }).fill("100");
  await page.getByRole("button", { name: "Add subscription" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Pick a service or type a name.");
});

test.describe("on a phone (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("has no horizontal overflow and keeps the paid / overflow actions reachable", async ({ page }) => {
    await page.goto("/subscriptions");
    await expect(page.locator(".sub-card").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);

    const row = page.locator(".sub-card", { hasText: "Netflix Premium" });
    await expect(row.getByRole("button", { name: "Paid" })).toBeVisible();
    await expect(row.getByRole("button", { name: "More actions" })).toBeVisible();
  });
});

test.describe("prices in dollars", () => {
  test("a dollar subscription shows in dollars with the baht amount, and counts in baht in the total", async ({ page, context }) => {
    await context.addCookies([{ name: "token", value: "test-usd-token", url: "http://localhost:3010" }]);
    await page.goto("/subscriptions");

    const claude = page.locator(".sub-card", { hasText: "Claude" });
    await expect(claude).toContainText("-$20.00");
    await expect(claude).toContainText("about ฿600"); // $1 = ฿30 in the mock

    // 819 + $20 x 30 = 1,419 a month
    await expect(page.getByRole("region", { name: "Subscription cost" })).toContainText("฿1,419");
    // Baht ones are unchanged
    await expect(page.locator(".sub-card", { hasText: "Netflix Premium" })).toContainText("-฿419");
  });

  test("adding a subscription in dollars previews the baht and sends the currency", async ({ page }) => {
    const posted: Record<string, unknown>[] = [];
    page.on("request", r => { if (r.method() === "POST" && /\/api\/recurring$/.test(r.url())) posted.push(r.postDataJSON()); });
    await page.goto("/subscriptions");

    await page.getByRole("textbox", { name: "Subscription name" }).fill("Claude");
    await page.getByRole("spinbutton", { name: "Price" }).fill("20");
    await expect(page.getByRole("button", { name: "Baht ฿" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "US dollar $" }).click();
    await expect(page.getByRole("status").filter({ hasText: "About" })).toContainText("฿600");

    await page.getByRole("button", { name: "Add subscription" }).click();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ amount: 20, currency: "USD", description: "Claude" });
  });

  test("a baht subscription sends baht", async ({ page }) => {
    const posted: Record<string, unknown>[] = [];
    page.on("request", r => { if (r.method() === "POST" && /\/api\/recurring$/.test(r.url())) posted.push(r.postDataJSON()); });
    await page.goto("/subscriptions");
    await page.getByRole("textbox", { name: "Subscription name" }).fill("Gym 2");
    await page.getByRole("spinbutton", { name: "Price" }).fill("500");
    await page.getByRole("button", { name: "Add subscription" }).click();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ amount: 500, currency: "THB" });
  });

  test("editing a subscription lets you switch its currency", async ({ page, context }) => {
    await context.addCookies([{ name: "token", value: "test-usd-token", url: "http://localhost:3010" }]);
    const puts: Record<string, unknown>[] = [];
    page.on("request", r => { if (r.method() === "PUT" && /\/api\/recurring\/11$/.test(r.url())) puts.push(r.postDataJSON()); });
    await page.goto("/subscriptions");
    await page.locator(".sub-card", { hasText: "Claude" }).getByRole("button", { name: "Edit" }).first().click();
    // The edit form sits above the "Add subscription" form, so its toggle comes first.
    await expect(page.getByRole("button", { name: "US dollar $" }).first()).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Baht ฿" }).first().click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => puts.length).toBe(1);
    expect(puts[0]).toMatchObject({ currency: "THB" });
  });
});
