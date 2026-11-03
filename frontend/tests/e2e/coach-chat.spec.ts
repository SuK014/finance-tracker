import { test, expect, type Page, type Route } from "@playwright/test";

// Runs against the isolated :3010 instance (NEXT_PUBLIC_COACH_ENABLED=true) with the coach endpoints mocked in each
// test, so no real coach, model or database is involved. See bottom-tab-bar.spec.ts for why :3010.
test.use({ baseURL: "http://localhost:3010" });

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

const REPLY = {
  answer: "เดือนกันยายนคุณใช้ค่าอาหารไป ฿6,120",
  route: "small",
  intent: "spend_lookup",
  answeredBy: "local",
  flags: [],
  escalatedBy: [],
  latencyS: 4.2,
  tip: null,
  receipt: [{ tool: "sum_by_category", args: { month: "2026-09", category: "food" }, result: 6120 }],
};

const ASK_BACK = {
  answer: "Grab หมายถึงเรียกรถหรือสั่งอาหาร",
  route: "clarify",
  intent: "trend",
  answeredBy: "none",
  flags: ["clarify"],
  escalatedBy: [],
  latencyS: 0.1,
  tip: null,
  receipt: [],
  options: [
    { label: "Grab เรียกรถ", question: "ค่า Grab เรียกรถ (ค่าเดินทาง) เดือนนี้เท่าไหร่" },
    { label: "Grab สั่งอาหาร", question: "ค่า Grab สั่งอาหาร (ค่าอาหาร) เดือนนี้เท่าไหร่" },
  ],
};

type Mock = { ready?: boolean; reason?: string; status?: number; body?: unknown; delayMs?: number };

async function mockCoach(page: Page, state: Mock = {}) {
  const asked: unknown[] = [];
  const control = { ...state };
  await page.route("**/api/chat**", async (route: Route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (req.url().endsWith("/health")) {
      return route.fulfill({
        status: 200, headers: CORS, contentType: "application/json",
        body: JSON.stringify({ ready: control.ready ?? true, reason: control.reason ?? "", warm: true }),
      });
    }
    asked.push(JSON.parse(req.postData() ?? "{}"));
    if (control.delayMs) await new Promise(r => setTimeout(r, control.delayMs));
    return route.fulfill({
      status: control.status ?? 200, headers: CORS, contentType: "application/json",
      body: JSON.stringify(control.body ?? REPLY),
    });
  });
  return { asked, control };
}

async function open(page: Page) {
  await page.getByRole("button", { name: /^Ask Buddy/ }).click();
  const panel = page.getByRole("dialog", { name: "Ask Buddy" });
  await panel.waitFor();
  // Measure only after the entrance animation has finished.
  await panel.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  return panel;
}

test.describe("Ask Buddy chat", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
  });

  test("when the coach is busy the chat says so in plain words and offers Try again", async ({ page }) => {
    await mockCoach(page, { status: 503, body: { error: "busy" } });
    await page.goto("/");
    const panel = await open(page);
    await panel.getByLabel("Your question").fill("ค่าอาหารเดือนนี้");
    await panel.getByRole("button", { name: "Send question" }).click();
    await expect(panel.getByRole("alert")).toContainText("answering other questions right now");
    await expect(panel.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("an ask-back shows buttons; tapping one sends its full question and the buttons go away", async ({ page }) => {
    const { asked, control } = await mockCoach(page, { body: ASK_BACK });
    await page.goto("/");
    const panel = await open(page);
    await panel.getByLabel("Your question").fill("Grab เดือนนี้เท่าไหร่");
    await panel.getByRole("button", { name: "Send question" }).click();

    const group = panel.getByRole("group", { name: "Quick replies" });
    await expect(group.getByRole("button")).toHaveText(["Grab เรียกรถ", "Grab สั่งอาหาร"]);
    await expect(panel.getByText("How I got this")).toHaveCount(0); // nothing was looked up, so no receipt

    control.body = REPLY;
    await group.getByRole("button", { name: "Grab เรียกรถ" }).click();
    await expect(panel.getByText("เดือนกันยายนคุณใช้ค่าอาหารไป ฿6,120")).toBeVisible();
    expect(asked).toEqual([
      { question: "Grab เดือนนี้เท่าไหร่" },
      { question: "ค่า Grab เรียกรถ (ค่าเดินทาง) เดือนนี้เท่าไหร่" },
    ]);
    await expect(group).toHaveCount(0); // old buttons are not left behind
  });

  test("the buttons are reachable and usable from the keyboard, with a visible focus ring", async ({ page }) => {
    const { asked, control } = await mockCoach(page, { body: ASK_BACK });
    await page.goto("/");
    const panel = await open(page);
    await panel.getByLabel("Your question").fill("Grab");
    await panel.getByRole("button", { name: "Send question" }).click();
    const second = panel.getByRole("button", { name: "Grab สั่งอาหาร" });
    await panel.getByRole("button", { name: "Grab เรียกรถ" }).focus();
    await page.keyboard.press("Tab"); // a real key press, so :focus-visible applies
    await expect(second).toBeFocused();
    const ring = await second.evaluate(el => getComputedStyle(el).boxShadow);
    expect(ring).not.toBe("none");
    control.body = REPLY;
    await page.keyboard.press("Enter");
    await expect(panel.getByText("เดือนกันยายนคุณใช้ค่าอาหารไป ฿6,120")).toBeVisible();
    expect(asked[1]).toEqual({ question: "ค่า Grab สั่งอาหาร (ค่าอาหาร) เดือนนี้เท่าไหร่" });
  });

  test("renders without console errors and opens with a hint, no example chips", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", e => errors.push(String(e)));
    await mockCoach(page);
    await page.goto("/");
    const panel = await open(page);
    await expect(panel.getByText("Ask in Thai or English.")).toBeVisible();
    await expect(panel.getByRole("button")).toHaveCount(2); // Close + Send; no clickable example questions
    expect(errors.filter(e => !/favicon|Failed to load resource/.test(e))).toEqual([]);
  });

  test("asks a question, shows the answer and a receipt, and never sends a user id", async ({ page }) => {
    const { asked } = await mockCoach(page);
    await page.goto("/");
    const panel = await open(page);
    await panel.getByLabel("Your question").fill("เดือนที่แล้วค่าอาหารเท่าไหร่");
    await panel.getByRole("button", { name: "Send question" }).click();

    await expect(panel.getByText("เดือนกันยายนคุณใช้ค่าอาหารไป ฿6,120")).toBeVisible();
    expect(asked).toEqual([{ question: "เดือนที่แล้วค่าอาหารเท่าไหร่" }]);

    await panel.getByText("How I got this").click();
    await expect(panel.getByText("Food, Sep 2026")).toBeVisible();
    await expect(panel.getByText("฿6,120", { exact: true })).toBeVisible();
    await expect(panel.getByText("Numbers calculated by code. Worded by the local model.")).toBeVisible();
    await expect(panel.locator('[lang="th"]').first()).toBeVisible();
  });

  test("Enter sends, Shift+Enter does not, and a Thai IME composition is never sent", async ({ page }) => {
    const { asked } = await mockCoach(page);
    await page.goto("/");
    const panel = await open(page);
    const input = panel.getByLabel("Your question");
    await input.fill("กำลังพิมพ์");
    await input.evaluate(el => el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, isComposing: true })));
    await page.keyboard.press("Shift+Enter");
    expect(asked).toHaveLength(0);
    await input.press("Enter");
    await expect(panel.getByText("How I got this")).toBeVisible();
    expect(asked).toHaveLength(1);
  });

  test("shows progress, then a note when the local model is slow to load", async ({ page }) => {
    await page.clock.install();
    await mockCoach(page, { delayMs: 1 });
    await page.goto("/");
    const panel = await open(page);
    await mockCoach(page, { delayMs: 60_000 });
    await panel.getByLabel("Your question").fill("hello");
    await panel.getByRole("button", { name: "Send question" }).click();
    await expect(panel.getByText("Checking your transactions…")).toBeVisible();
    await expect(panel.getByText(/still loading/)).toBeHidden();
    await page.clock.fastForward(16_000);
    await expect(panel.getByText(/The local model is still loading/)).toBeVisible();
  });

  test("offline: muted button, clear message, input disabled, recovers by itself", async ({ page }) => {
    const { control } = await mockCoach(page, { ready: false, reason: "coach_not_running" });
    await page.goto("/");
    const fab = page.getByRole("button", { name: "Ask Buddy (offline)" });
    await expect(fab).toBeVisible();
    await fab.click();
    const panel = page.getByRole("dialog", { name: "Ask Buddy" });
    await expect(panel.getByText("Coach isn't running.")).toBeVisible();
    await expect(panel.getByText(/python dev\.py serve/)).toBeVisible();
    await expect(panel.getByLabel("Your question")).toBeDisabled();

    control.ready = true;
    await expect(panel.getByLabel("Your question")).toBeEnabled({ timeout: 15_000 });
    await expect(panel.getByText("Coach isn't running.")).toBeHidden();
  });

  test("a failed question shows a plain message and Try again works", async ({ page }) => {
    const { control } = await mockCoach(page, { status: 503, body: { error: "database_unavailable" } });
    await page.goto("/");
    const panel = await open(page);
    await panel.getByLabel("Your question").fill("food?");
    await panel.getByRole("button", { name: "Send question" }).click();
    await expect(panel.getByRole("alert")).toContainText("Couldn't read your transactions");
    await expect(panel.getByRole("alert")).not.toContainText("password");

    control.status = 200;
    control.body = REPLY;
    await panel.getByRole("button", { name: "Try again" }).click();
    await expect(panel.getByText("How I got this")).toBeVisible();
  });

  test("New chat clears the transcript", async ({ page }) => {
    await mockCoach(page);
    await page.goto("/");
    const panel = await open(page);
    await panel.getByLabel("Your question").fill("food?");
    await panel.getByLabel("Your question").press("Enter");
    await expect(panel.getByText("How I got this")).toBeVisible();
    await panel.getByRole("button", { name: "New chat" }).click();
    await expect(panel.getByText("How I got this")).toBeHidden();
    await expect(panel.getByText("Ask in Thai or English.")).toBeVisible();
  });

  test("keyboard: button takes a visible focus ring, Escape closes and returns focus", async ({ page }) => {
    await mockCoach(page);
    await page.goto("/");
    const fab = page.getByRole("button", { name: "Ask Buddy" });
    await fab.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(fab).toBeFocused();
    expect(await fab.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none");

    await page.keyboard.press("Enter");
    const panel = page.getByRole("dialog", { name: "Ask Buddy" });
    await expect(panel).toBeVisible();
    await expect(panel.getByLabel("Your question")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(fab).toBeFocused();
  });

  test("desktop: a right-hand drawer that leaves the page usable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockCoach(page);
    await page.goto("/");
    const panel = await open(page);
    const box = await panel.boundingBox();
    expect(box!.width).toBe(400);
    expect(box!.x + box!.width).toBeCloseTo(1280, 0);
    await expect(page.locator(".coach-backdrop")).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
  });

  test("phone: button clears the centre + and the tab bar, and opens a bottom sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockCoach(page);
    await page.goto("/");
    const fab = await page.getByRole("button", { name: "Ask Buddy" }).boundingBox();
    const add = await page.getByRole("button", { name: "Add transaction" }).boundingBox();
    const bar = await page.getByRole("navigation", { name: "Primary" }).boundingBox();
    expect(fab!.y + fab!.height).toBeLessThanOrEqual(bar!.y); // sits above the tab bar
    const overlap = !(fab!.x + fab!.width <= add!.x || add!.x + add!.width <= fab!.x ||
      fab!.y + fab!.height <= add!.y || add!.y + add!.height <= fab!.y);
    expect(overlap).toBe(false);

    const panel = await open(page);
    const box = await panel.boundingBox();
    expect(box!.width).toBe(390);
    expect(box!.height).toBeGreaterThan(844 * 0.6);
    expect(box!.y + box!.height).toBeCloseTo(844, 0);
    await page.locator(".coach-backdrop").click({ position: { x: 100, y: 40 } });
    await expect(panel).toBeHidden();
  });

  test("text stays inside the panel at phone width with a long reply", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await mockCoach(page, { body: { ...REPLY, answer: "ค่าอาหาร".repeat(40) + " https://example.com/" + "a".repeat(80) } });
    await page.goto("/");
    const panel = await open(page);
    await panel.getByLabel("Your question").fill("x");
    await panel.getByLabel("Your question").press("Enter");
    await expect(panel.getByText("How I got this")).toBeVisible();
    const overflow = await panel.locator(".coach-log").evaluate(el => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
