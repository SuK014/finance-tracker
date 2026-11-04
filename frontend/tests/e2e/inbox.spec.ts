import { test, expect, type Page } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts). The inbox endpoints are answered per test
// with page.route, so each test has its own slips and nothing is shared between parallel workers.
// Fixture account: "Kasikorn" (id 1, THB); category "Groceries" (id 1).
test.use({ baseURL: "http://localhost:3010" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const readSlip = {
  id: 1, rawText: "โอนเงินสำเร็จ", amount: 1250.5, type: "expense", description: "Coffee shop",
  day: "2026-10-26", time: "14:32", timeSource: "slip", parsedBy: "ai", takenAt: "2026-10-26T14:40:00.000+07:00",
  createdAt: "2026-10-26T14:41:00.000+07:00", hasImage: true,
  duplicateOf: { id: 7, amount: 1250.5, description: "Coffee", date: "2026-10-26T14:30:00.000+07:00" },
};
const unreadSlip = {
  id: 2, rawText: "abc", amount: null, type: null, description: null,
  day: "2026-10-27", time: null, timeSource: null, parsedBy: "rules", takenAt: null,
  createdAt: "2026-10-27T09:00:00.000+07:00", hasImage: false, duplicateOf: null,
};

async function mockInbox(page: Page, slips: Array<Record<string, unknown>>) {
  let list = [...slips];
  const confirmed: Array<Record<string, unknown>> = [];
  const rejected: number[] = [];
  await page.route("**/api/inbox**", async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (path === "/api/inbox" && req.method() === "GET") return json(200, { count: list.length, slips: list });
    const image = path.match(/^\/api\/inbox\/(\d+)\/image$/);
    if (image) return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "image/png" }, body: PNG });
    const confirm = path.match(/^\/api\/inbox\/(\d+)\/confirm$/);
    if (confirm) {
      confirmed.push({ id: Number(confirm[1]), ...req.postDataJSON() });
      list = list.filter(s => s.id !== Number(confirm[1]));
      return json(201, { id: 99 });
    }
    const reject = path.match(/^\/api\/inbox\/(\d+)\/reject$/);
    if (reject) {
      rejected.push(Number(reject[1]));
      list = list.filter(s => s.id !== Number(reject[1]));
      return route.fulfill({ status: 204, headers: CORS });
    }
    return json(404, { error: "not mocked" });
  });
  return { confirmed, rejected };
}

test.describe("slip inbox on Home", () => {
  test("shows nothing when no slips are waiting", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".inbox-banner")).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: /waiting/ })).toHaveCount(0);
  });

  test("a banner and a pop-up ask you to check waiting slips; Later hides the pop-up for this visit only", async ({ page }) => {
    await mockInbox(page, [readSlip, unreadSlip]);
    await page.goto("/");

    const banner = page.getByRole("link", { name: /2 slips to check/ });
    await expect(banner).toBeVisible({ timeout: 15000 });
    const popup = page.getByRole("dialog", { name: "2 slips are waiting" });
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("Check them before they count in your totals.");
    // No way to switch it off for good
    await expect(popup.getByRole("checkbox")).toHaveCount(0);

    await popup.getByRole("button", { name: "Later" }).click();
    await expect(popup).toHaveCount(0);
    await expect(banner).toBeVisible();

    // Same visit: coming back to Home does not ask again, but the banner is still there
    await page.reload();
    await expect(banner).toBeVisible();
    await expect(page.getByRole("dialog", { name: /waiting/ })).toHaveCount(0);

    // A new visit (a fresh tab, so no session memory) asks again
    const fresh = await page.context().newPage();
    await mockInbox(fresh, [readSlip, unreadSlip]);
    await fresh.goto("/");
    await expect(fresh.getByRole("dialog", { name: "2 slips are waiting" })).toBeVisible({ timeout: 15000 });
  });

  test("Escape closes the pop-up like Later", async ({ page }) => {
    await mockInbox(page, [readSlip]);
    await page.goto("/");
    const popup = page.getByRole("dialog", { name: "1 slip is waiting" });
    await expect(popup).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(page.getByRole("link", { name: "1 slip to check" })).toBeVisible();
  });
});

test.describe("checking slips", () => {
  test("renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", err => errors.push(err.message));
    await mockInbox(page, [readSlip]);
    await page.goto("/inbox");
    await expect(page.getByLabel("Slip summary")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "View screenshot" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("confirm, then the next slip; fixing and rejecting the unreadable one; then back Home", async ({ page }) => {
    const { confirmed, rejected } = await mockInbox(page, [readSlip, unreadSlip]);
    await page.goto("/");
    await page.getByRole("dialog", { name: "2 slips are waiting" }).getByRole("button", { name: "Review now" }).click();
    await expect(page).toHaveURL(/\/inbox$/);

    // First slip: what was read, where the time came from, and the duplicate warning
    await expect(page.getByText("1 of 2")).toBeVisible();
    const summary = page.getByLabel("Slip summary");
    await expect(summary).toContainText("−฿1,250.5");
    await expect(summary).toContainText("2:32 PM");
    await expect(summary).toContainText("Time read from the slip");
    await expect(page.getByRole("status").filter({ hasText: "Looks like a duplicate of Coffee" })).toContainText("You can still confirm it.");
    await expect(page.getByRole("textbox", { name: "Note" })).toHaveValue("Coffee shop");
    // The account starts on the first account
    await expect(page.getByRole("button", { name: "Account" })).toContainText("Kasikorn");

    await page.getByRole("button", { name: /Groceries/ }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect.poll(() => confirmed.length).toBe(1);
    expect(confirmed[0]).toEqual({
      id: 1, amount: 1250.5, type: "expense", date: "2026-10-26", time: "14:32",
      accountId: 1, categoryId: 1, description: "Coffee shop",
    });

    // Straight to the next slip: unreadable, with no time
    await expect(page.getByText("2 of 2")).toBeVisible();
    await expect(page.getByText("Couldn't read this slip. Fill it in from the screenshot.")).toBeVisible();
    await expect(page.getByText("No time found. Add it below.")).toBeVisible();
    await page.getByText("Text the phone read").click();
    await expect(page.getByText("abc", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.locator("p.sheet-error")).toHaveText("Enter the amount.");
    await page.getByRole("textbox", { name: "Amount" }).fill("90");
    await expect(page.getByLabel("Slip summary")).toContainText("−฿90");
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.locator("p.sheet-error")).toHaveText("Add the time of the payment.");
    expect(confirmed).toHaveLength(1);

    // Typing a time clears the "no time found" note
    await page.getByRole("textbox", { name: /Type time/ }).fill("");
    await page.getByRole("textbox", { name: /Type time/ }).pressSequentially("0915");
    await expect(page.getByLabel("Slip summary")).toContainText("9:15 AM");
    await expect(page.getByText("No time found. Add it below.")).toHaveCount(0);

    await page.getByRole("button", { name: "Reject" }).click();
    await expect.poll(() => rejected).toEqual([2]);

    // Last one handled: back on Home with a short message, and the banner is gone
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("All checked")).toBeVisible();
    await expect(page.locator(".inbox-banner")).toHaveCount(0);
  });

  test("starts on the account that matches the bank the Shortcut sent", async ({ page }) => {
    const { confirmed } = await mockInbox(page, [{ ...readSlip, duplicateOf: null, bank: "scb", suggestedAccountId: 2 }]);
    await page.route("**/api/accounts", route => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({
        status: 200, headers: { ...CORS, "content-type": "application/json" },
        body: JSON.stringify([{ id: 1, name: "Kasikorn", currency: "THB" }, { id: 2, name: "SCB Salary", currency: "THB" }]),
      });
    });
    await page.goto("/inbox");
    await expect(page.getByRole("button", { name: "Account" })).toContainText("SCB Salary");
    await expect(page.getByText("Chosen from the bank in your Shortcut (scb)")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect.poll(() => confirmed.length).toBe(1);
    expect(confirmed[0]).toMatchObject({ accountId: 2 });
  });

  test("with no matching bank it falls back to the first account and says nothing about a match", async ({ page }) => {
    await mockInbox(page, [readSlip]);
    await page.goto("/inbox");
    await expect(page.getByRole("button", { name: "Account" })).toContainText("Kasikorn");
    await expect(page.getByText(/Chosen from the bank/)).toHaveCount(0);
  });

  test("the screenshot opens full size from the thumbnail", async ({ page }) => {
    await mockInbox(page, [readSlip]);
    await page.goto("/inbox");
    await page.getByRole("button", { name: "View screenshot" }).click();
    const dialog = page.getByRole("dialog", { name: "Screenshot" });
    await expect(dialog.getByRole("img", { name: /bank app screenshot/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("an empty inbox says so", async ({ page }) => {
    await mockInbox(page, []);
    await page.goto("/inbox");
    await expect(page.getByText("No slips to check.")).toBeVisible({ timeout: 15000 });
  });

  test("a failed load explains itself and can retry", async ({ page }) => {
    let fail = true;
    await page.route("**/api/inbox", route => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (fail) return route.fulfill({ status: 500, headers: CORS, body: "{}" });
      return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify({ count: 0, slips: [] }) });
    });
    await page.goto("/inbox");
    await expect(page.locator(".sheet-warn[role=alert]")).toContainText("Couldn't load your slips");
    fail = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("No slips to check.")).toBeVisible();
  });

  test("a slip still being read waits, then fills in", async ({ page }) => {
    const reading = { ...readSlip, parsedBy: null, amount: null, time: null, timeSource: null, duplicateOf: null };
    let calls = 0;
    await page.route("**/api/inbox", route => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      calls += 1;
      const slip = calls < 3 ? reading : readSlip;
      return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify({ count: 1, slips: [{ ...slip, duplicateOf: null }] }) });
    });
    await page.route("**/api/inbox/*/image", route => route.fulfill({ status: 200, headers: { ...CORS, "content-type": "image/png" }, body: PNG }));
    await page.goto("/inbox");
    await expect(page.getByText("Reading this slip…")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Confirm" })).toBeDisabled();
    await expect(page.getByLabel("Slip summary")).toContainText("−฿1,250.5", { timeout: 15000 });
  });

  test("on a phone (390px): no horizontal overflow, and Confirm is reachable by keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockInbox(page, [readSlip]);
    await page.goto("/inbox");
    await expect(page.getByLabel("Slip summary")).toBeVisible({ timeout: 15000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const confirm = page.getByRole("button", { name: "Confirm" });
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      if (await confirm.evaluate(el => el === document.activeElement)) break;
    }
    await expect(confirm).toBeFocused();
    const ring = await confirm.evaluate(el => getComputedStyle(el).boxShadow);
    expect(ring).not.toBe("none");
  });
});

test.describe("inbox key in Settings", () => {
  test("makes a key that is shown once, and can replace or remove it", async ({ page }) => {
    let hasKey = false;
    await page.route("**/api/inbox/key", async route => {
      const req = route.request();
      const json = (status: number, body: unknown) =>
        route.fulfill({ status, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (req.method() === "GET") return json(200, { hasKey });
      if (req.method() === "POST") { hasKey = true; return json(201, { key: "ngt_testkey123" }); }
      hasKey = false;
      return route.fulfill({ status: 204, headers: CORS });
    });
    page.on("dialog", d => d.accept());
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/settings");
    const card = page.getByRole("region", { name: "Slip inbox" });
    await expect(card.getByRole("button", { name: "Make key" })).toBeVisible({ timeout: 15000 });

    await card.getByRole("button", { name: "Make key" }).click();
    await expect(card.getByRole("textbox", { name: "Your key" })).toHaveValue("ngt_testkey123");
    await expect(card).toContainText("Copy it now. It won't be shown again.");
    await card.getByRole("button", { name: "Copy key" }).click();
    await expect(card.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ngt_testkey123");

    // Back to the page later: the key is not shown again
    await page.reload();
    await expect(card).toContainText("A key is set. It can't be shown again.");
    await expect(card.getByRole("textbox", { name: "Your key" })).toHaveCount(0);

    await card.getByRole("button", { name: "Remove key" }).click();
    await expect(card.getByRole("button", { name: "Make key" })).toBeVisible();
  });
});
