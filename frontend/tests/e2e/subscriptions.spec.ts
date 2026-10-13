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
