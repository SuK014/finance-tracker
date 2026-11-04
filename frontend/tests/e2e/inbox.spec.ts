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
  test("no slips waiting: the bell has no count and opens an empty list", async ({ page }) => {
    await mockInbox(page, []);
    await page.goto("/");
    const bell = page.getByRole("button", { name: "Slips to check" });
    await expect(bell).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".bell-badge")).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: /waiting/ })).toHaveCount(0);
    await bell.click();
    await expect(page.getByRole("dialog", { name: "Slips to check" }).getByText("No slips to check.")).toBeVisible();
  });

  test("the bell sits in the top right of the header with the number of waiting slips", async ({ page }) => {
    await mockInbox(page, [readSlip, unreadSlip]);
    await page.goto("/");
    const bell = page.getByRole("button", { name: "Slips to check, 2 waiting" });
    await expect(bell).toBeVisible({ timeout: 15000 });
    await expect(bell.locator(".bell-badge")).toHaveText("2");
    const [bellBox, greetingBox, viewport] = await Promise.all([
      bell.boundingBox(),
      page.locator(".home-greeting").boundingBox(),
      page.viewportSize(),
    ]);
    expect(bellBox!.x).toBeGreaterThan(greetingBox!.x + greetingBox!.width); // to the right of the greeting
    expect(bellBox!.y).toBeLessThan(120); // in the header, not further down the page
    expect(bellBox!.x + bellBox!.width).toBeLessThanOrEqual(viewport!.width);
  });

  test("a pop-up asks you to check waiting slips; Later hides it for this visit only", async ({ page }) => {
    await mockInbox(page, [readSlip, unreadSlip]);
    await page.goto("/");

    const bell = page.getByRole("button", { name: /2 waiting/ });
    await expect(bell).toBeVisible({ timeout: 15000 });
    const popup = page.getByRole("dialog", { name: "2 slips are waiting" });
    await expect(popup).toBeVisible();
    await expect(popup).toContainText("Check them before they count in your totals.");
    // No way to switch it off for good
    await expect(popup.getByRole("checkbox")).toHaveCount(0);

    await popup.getByRole("button", { name: "Later" }).click();
    await expect(popup).toHaveCount(0);
    await expect(bell).toBeVisible();

    // Same visit: coming back to Home does not ask again, but the bell still shows the count
    await page.reload();
    await expect(bell).toBeVisible();
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
    await expect(page.getByRole("button", { name: "Slips to check, 1 waiting" })).toBeVisible();
  });

  test("note suggestions in the pop-up fit inside it, clear of the Confirm bar", async ({ page }) => {
    await mockInbox(page, [readSlip]);
    const history = ["Grab", "Card", "france fried", "KFC", "Water", "Tea"].map((description, i) => ({
      id: i + 1, amount: 50, type: "expense", description, date: `2026-11-0${i + 1}T12:00:00.000+07:00`, accountId: 1, categoryId: 1,
    }));
    await page.route("**/api/transactions", route => {
      const method = route.request().method();
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (method !== "GET") return route.continue();
      return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(history) });
    });
    await page.goto("/");
    await page.getByRole("dialog", { name: "1 slip is waiting" }).getByRole("button", { name: "Review now" }).click();
    const review = page.getByRole("dialog", { name: "Slips to check" });
    const note = review.getByRole("combobox", { name: "Note" });
    await note.fill("");
    await note.focus();
    const list = review.getByRole("listbox", { name: "Notes you used before" });
    await expect(list.getByRole("option")).toHaveCount(6);
    const [listBox, fieldsBox, actionsBox] = await Promise.all([
      list.boundingBox(),
      review.locator(".slip-fields").boundingBox(),
      review.locator(".slip-actions").boundingBox(),
    ]);
    expect(listBox!.y).toBeGreaterThanOrEqual(fieldsBox!.y - 1);
    expect(listBox!.y + listBox!.height).toBeLessThanOrEqual(actionsBox!.y + 1);
  });

  test("tapping the bell opens the review as a pop-up, and the screenshot opens on top of it", async ({ page }) => {
    await mockInbox(page, [readSlip]);
    await page.goto("/");
    await page.getByRole("dialog", { name: "1 slip is waiting" }).getByRole("button", { name: "Later" }).click();
    await page.getByRole("button", { name: "Slips to check, 1 waiting" }).click();

    const review = page.getByRole("dialog", { name: "Slips to check" });
    await expect(review.getByLabel("Slip summary")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    // A second pop-up on top of the first one, then back to the review
    await review.getByRole("button", { name: "View screenshot" }).click();
    const shot = page.getByRole("dialog", { name: "Screenshot" });
    await expect(shot.getByRole("img", { name: /bank app screenshot/ })).toBeVisible();
    // It is not trapped inside the first pop-up: it hangs off <body> and sits fully on screen
    expect(await shot.evaluate(el => el.parentElement === document.body)).toBe(true);
    const box = await shot.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    await page.keyboard.press("Escape");
    await expect(shot).toHaveCount(0);
    await expect(review).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(review).toHaveCount(0);
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
    const review = page.getByRole("dialog", { name: "Slips to check" });
    await expect(review).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    // First slip: what was read, where the time came from, and the duplicate warning
    await expect(page.getByText("1 of 2")).toBeVisible();
    const summary = page.getByLabel("Slip summary");
    await expect(summary).toContainText("−฿1,250.5");
    await expect(summary).toContainText("2:32 PM");
    await expect(summary).toContainText("Time read from the slip");
    await expect(page.getByRole("status").filter({ hasText: "Looks like a duplicate of Coffee" })).toContainText("You can still confirm it.");
    await expect(page.getByRole("combobox", { name: "Note" })).toHaveValue("Coffee shop");
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

    // Last one handled: the pop-up closes with a short message, and the bell has no count left
    await expect(review).toHaveCount(0);
    await expect(page.getByText("All checked")).toBeVisible();
    await expect(page.locator(".bell-badge")).toHaveCount(0);
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

test.describe("review pop-up on a phone", () => {
  test("390px: the bell is in view, Confirm stays on screen inside the pop-up, nothing overflows sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockInbox(page, [readSlip]);
    await page.goto("/");
    await page.getByRole("dialog", { name: "1 slip is waiting" }).getByRole("button", { name: "Review now" }).click();
    const review = page.getByRole("dialog", { name: "Slips to check" });
    await expect(review.getByLabel("Slip summary")).toBeVisible({ timeout: 15000 });
    await expect(review.getByRole("button", { name: "Confirm" })).toBeInViewport();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.keyboard.press("Escape");
    await expect(review).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Slips to check, 1 waiting" })).toBeInViewport();
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
