import { test, expect } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts).
test.use({ baseURL: "http://localhost:3010", viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

// A fake speech engine: start() "hears" a sentence, stop() ends the session.
const FAKE_SPEECH = `
  window.__langs = [];
  class FakeRecognition {
    start() {
      window.__langs.push(this.lang);
      setTimeout(() => this.onresult && this.onresult({ results: [[{ transcript: window.__said || "coffee 85 yesterday" }]] }), 50);
    }
    stop() { setTimeout(() => this.onend && this.onend(), 10); }
  }
  window.webkitSpeechRecognition = window.SpeechRecognition = FakeRecognition;
`;

test.describe("voice add (Say it)", () => {
  test("speaking fills the amount, category, note and date, and nothing is saved until Save", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    let posted = false;
    page.on("request", r => { if (r.method() === "POST" && r.url().endsWith("/api/transactions")) posted = true; });

    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });

    await dialog.getByRole("button", { name: /Say it/ }).click();
    await expect(dialog.getByRole("status").locator("q")).toBeVisible();
    await dialog.getByRole("button", { name: /Stop/ }).click();

    await expect(dialog.getByRole("textbox", { name: "Amount" })).toHaveValue("85");
    await expect(dialog.getByRole("button", { name: /Groceries/ })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("textbox", { name: "Note" })).toHaveValue("coffee");
    await expect(dialog.getByRole("status").filter({ hasText: "Heard" })).toContainText("coffee 85 yesterday");
    expect(posted).toBe(false);

    await dialog.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByText("Transaction saved")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the TH/EN toggle sets the recognition language and is remembered", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    const group = dialog.getByRole("group", { name: "Spoken language" });

    await expect(group.getByRole("button", { name: "TH" })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "EN" }).click();
    await dialog.getByRole("button", { name: /Say it/ }).click();
    await expect(dialog.getByRole("status").locator("q")).toBeVisible();
    await dialog.getByRole("button", { name: /Stop/ }).click();
    await expect(dialog.getByRole("textbox", { name: "Amount" })).toHaveValue("85");
    expect(await page.evaluate(() => (window as unknown as { __langs: string[] }).__langs)).toEqual(["en-US"]);

    await page.reload();
    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(
      page.getByRole("group", { name: "Spoken language" }).getByRole("button", { name: "EN" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("when nothing has an amount it says so instead of guessing", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH + `window.__said = "nothing here";`);
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    await dialog.getByRole("button", { name: /Say it/ }).click();
    await expect(dialog.getByRole("status").locator("q")).toBeVisible();
    await dialog.getByRole("button", { name: /Stop/ }).click();
    await expect(dialog.getByRole("status").filter({ hasText: "no amount" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Amount" })).toHaveValue("");
  });

  test("without speech support there is no mic, but typing a sentence works the same", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      delete w.webkitSpeechRecognition;
      delete w.SpeechRecognition;
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    await expect(dialog.getByRole("button", { name: /Say it/ })).toHaveCount(0);

    await dialog.getByRole("textbox", { name: "Type it instead" }).fill("coffee 85 yesterday");
    await dialog.getByRole("button", { name: "Fill in" }).click();
    await expect(dialog.getByRole("textbox", { name: "Amount" })).toHaveValue("85");
    await expect(dialog.getByRole("button", { name: /Groceries/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("a blocked microphone shows a clear message", async ({ page }) => {
    await page.addInitScript(`
      class Denied { start() { setTimeout(() => { this.onerror && this.onerror({ error: "not-allowed" }); this.onend && this.onend(); }, 20); } stop() {} }
      window.webkitSpeechRecognition = window.SpeechRecognition = Denied;
    `);
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    await dialog.getByRole("button", { name: /Say it/ }).click();
    await expect(dialog.getByRole("alert")).toContainText("Microphone access is blocked");
  });
});
