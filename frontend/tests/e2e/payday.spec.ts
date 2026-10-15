import { test, expect, type Page } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts).
// A user signed in with "test-salary-token" has a ฿30,000 salary due 25 Dec 2026 into Kasikorn.
// Goals: "Japan trip" (rule: ฿300 each payday) and "Emergency fund" (rule: 10% of salary).
test.use({ baseURL: "http://localhost:3010" });

async function signIn(page: Page, token: string) {
  await page.context().addCookies([{ name: "token", value: token, url: "http://localhost:3010" }]);
}

function capture(page: Page, pattern: RegExp) {
  const bodies: Record<string, unknown>[] = [];
  page.on("request", r => {
    if (r.method() === "POST" && pattern.test(r.url())) bodies.push(r.postDataJSON());
  });
  return bodies;
}

test.describe("payday", () => {
  test("without a salary, the salary page offers to set one up and saves it as a monthly income", async ({ page }) => {
    await signIn(page, "test-fake-token");
    const posted = capture(page, /\/api\/recurring$/);
    await page.goto("/salary");

    const card = page.getByRole("region", { name: "Payday" });
    await expect(card).toContainText("Pay yourself first");
    await card.getByRole("button", { name: "Set up your salary" }).click();

    const dialog = page.getByRole("dialog", { name: "Set up your salary" });
    await dialog.getByRole("button", { name: "Save salary" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Enter your usual salary.");

    await dialog.getByRole("spinbutton", { name: "Usual monthly salary" }).fill("30000");
    await dialog.getByRole("button", { name: "Save salary" }).click();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ amount: 30000, type: "income", accountId: 1, frequency: "monthly", description: "Salary" });
  });

  test("with a salary, shows the next payday and the saving rules", async ({ page }) => {
    await signIn(page, "test-salary-token");
    await page.goto("/salary");
    const card = page.getByRole("region", { name: "Payday" });
    await expect(card).toContainText("Next payday · 25 Dec");
    await expect(card).toContainText("฿30,000");
    await expect(card).toContainText("into Kasikorn");
    await expect(card).toContainText("Japan trip ฿300");
    await expect(card).toContainText("Emergency fund 10%");
  });

  test("Mark received prefills each goal from its rule, shows what you keep, and sends the allocations", async ({ page }) => {
    await signIn(page, "test-salary-token");
    const posted = capture(page, /\/api\/recurring\/9\/receive$/);
    await page.goto("/salary");
    await page.getByRole("button", { name: "Mark received" }).click();
    const dialog = page.getByRole("dialog", { name: "Salary received" });

    await expect(dialog.getByRole("spinbutton", { name: /Japan trip/ })).toHaveValue("300");
    await expect(dialog.getByRole("spinbutton", { name: /Emergency fund/ })).toHaveValue("3000");
    // ฿30,000 - ฿300 - ฿3,000
    await expect(dialog.getByRole("status")).toContainText("฿26,700");

    // A lower salary this month: the percentage rule follows, the fixed one doesn't.
    await dialog.getByRole("spinbutton", { name: "Amount received" }).fill("20000");
    await expect(dialog.getByRole("spinbutton", { name: /Emergency fund/ })).toHaveValue("2000");
    await expect(dialog.getByRole("status")).toContainText("฿17,700");

    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({
      amount: 20000,
      allocations: [{ goalId: 1, amount: 300 }, { goalId: 2, amount: 2000 }],
    });
  });

  test("setting aside more than you received is refused", async ({ page }) => {
    await signIn(page, "test-salary-token");
    const posted = capture(page, /\/api\/recurring\/9\/receive$/);
    await page.goto("/salary");
    await page.getByRole("button", { name: "Mark received" }).click();
    const dialog = page.getByRole("dialog", { name: "Salary received" });

    await dialog.getByRole("spinbutton", { name: /Japan trip/ }).fill("40000");
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("You're setting aside more than you received.");
    expect(posted).toHaveLength(0);
  });

  test("Skip goals this month records the salary with nothing set aside", async ({ page }) => {
    await signIn(page, "test-salary-token");
    const posted = capture(page, /\/api\/recurring\/9\/receive$/);
    await page.goto("/salary");
    await page.getByRole("button", { name: "Mark received" }).click();
    await page.getByRole("dialog", { name: "Salary received" }).getByRole("button", { name: "Skip goals this month" }).click();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ amount: 30000, allocations: [] });
  });

  test("a goal's saving rule can be set when editing it", async ({ page }) => {
    await signIn(page, "test-salary-token");
    await page.goto("/goals");
    await page.getByRole("listitem", { name: "Japan trip" }).getByRole("button", { name: /more|actions|⋯/i }).click();
    await page.getByRole("menuitem", { name: "Edit goal" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit goal" });

    await expect(dialog.getByRole("button", { name: "Fixed ฿" })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "% of salary" }).click();
    await dialog.getByRole("spinbutton", { name: "Amount to set aside each payday" }).fill("150");
    await dialog.getByRole("button", { name: "Save goal" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("A percentage can't be more than 100.");
  });

  test("Home shows the next payday, and the salary is not listed as a subscription", async ({ page }) => {
    await signIn(page, "test-salary-token");
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Goals" })).toContainText("Next payday 25 Dec");

    await page.goto("/subscriptions");
    await expect(page.getByText("Netflix Premium")).toBeVisible();
    await expect(page.getByRole("main").getByText("Salary")).toHaveCount(0);
  });
});
