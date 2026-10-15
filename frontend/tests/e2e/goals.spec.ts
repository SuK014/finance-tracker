import { test, expect, type Page } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts).
// Fixture: account Kasikorn with ฿1,000 (฿400 set aside, ฿600 available).
// Goals: "Japan trip" ฿400 of ฿1,000 (deadline Dec 2027) and "Emergency fund" ฿0 of ฿5,000.
test.use({ baseURL: "http://localhost:3010" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

function capture(page: Page, pattern: RegExp) {
  const bodies: Record<string, unknown>[] = [];
  page.on("request", r => {
    if (r.method() === "POST" && pattern.test(r.url())) bodies.push(r.postDataJSON());
  });
  return bodies;
}

const japan = (page: Page) => page.getByRole("listitem", { name: "Japan trip" });

test.describe("goals", () => {
  test("lists each goal with its progress, monthly amount and where the money sits", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/goals");

    await expect(page.getByRole("heading", { name: "Goals", exact: true })).toBeVisible();
    const card = japan(page);
    await expect(card).toContainText("฿400 of ฿1,000");
    await expect(card.getByRole("progressbar", { name: "Japan trip progress" })).toHaveAttribute("aria-valuenow", "40");
    await expect(card).toContainText(/Save ฿[\d,]+ a month to finish by Dec 2027/);
    await expect(card).toContainText("฿400 in Kasikorn");

    const emergency = page.getByRole("listitem", { name: "Emergency fund" });
    await expect(emergency).toContainText("฿5,000 to go");
    await expect(emergency.getByRole("button", { name: "Spend" })).toBeDisabled();
    expect(errors).toEqual([]);
  });

  test("a new goal is created with its name, icon and target", async ({ page }) => {
    const posted = capture(page, /\/api\/goals$/);
    await page.goto("/goals");
    await page.getByRole("button", { name: "+ New goal" }).click();
    const dialog = page.getByRole("dialog", { name: "New goal" });

    await dialog.getByRole("textbox", { name: "Name" }).fill("New laptop");
    await dialog.getByRole("button", { name: "Icon 🎮" }).click();
    await dialog.getByRole("spinbutton", { name: "Target" }).fill("35000");
    await dialog.getByRole("button", { name: "Create goal" }).click();

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ name: "New laptop", icon: "🎮", target: 35000, deadline: null });
    await expect(dialog).toBeHidden();
  });

  test("a goal needs a name and a target", async ({ page }) => {
    const posted = capture(page, /\/api\/goals$/);
    await page.goto("/goals");
    await page.getByRole("button", { name: "+ New goal" }).click();
    const dialog = page.getByRole("dialog", { name: "New goal" });
    await dialog.getByRole("button", { name: "Create goal" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Give the goal a name.");
    await dialog.getByRole("textbox", { name: "Name" }).fill("X");
    await dialog.getByRole("button", { name: "Create goal" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Enter a target above 0.");
    expect(posted).toHaveLength(0);
  });

  test("adding money sends the account and amount, and refuses more than is available", async ({ page }) => {
    const posted = capture(page, /\/api\/goals\/1\/deposit$/);
    await page.goto("/goals");
    await japan(page).getByRole("button", { name: "Add money" }).click();
    const dialog = page.getByRole("dialog", { name: /Add money/ });

    await expect(dialog.getByRole("button", { name: "From account" })).toContainText("Kasikorn · ฿600 available");
    await dialog.getByRole("spinbutton", { name: "Amount" }).fill("700");
    await dialog.getByRole("button", { name: "Set aside" }).click();
    await expect(dialog.getByRole("alert")).toContainText("more than the ฿600");
    expect(posted).toHaveLength(0);

    await dialog.getByRole("spinbutton", { name: "Amount" }).fill("300");
    await dialog.getByRole("button", { name: "Set aside" }).click();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ accountId: 1, amount: 300 });
  });

  test("spending from a goal records the category and amount", async ({ page }) => {
    const posted = capture(page, /\/api\/goals\/1\/spend$/);
    await page.goto("/goals");
    await japan(page).getByRole("button", { name: "Spend", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /Spend from goal/ });

    await dialog.getByRole("spinbutton", { name: "Amount" }).fill("150");
    await dialog.getByRole("button", { name: "Category" }).click();
    await dialog.getByRole("option", { name: "Groceries" }).click();
    await dialog.getByRole("button", { name: "Record spending" }).click();

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ accountId: 1, amount: 150, categoryId: 1 });
  });

  test("taking money back is in the ⋯ menu and cannot exceed what the goal holds", async ({ page }) => {
    const posted = capture(page, /\/api\/goals\/1\/withdraw$/);
    await page.goto("/goals");
    await japan(page).getByRole("button", { name: /more|actions|⋯/i }).click();
    await page.getByRole("menuitem", { name: "Take money back" }).click();
    const dialog = page.getByRole("dialog", { name: /Take money back/ });

    await dialog.getByRole("spinbutton", { name: "Amount" }).fill("500");
    await dialog.getByRole("button", { name: "Take back" }).click();
    await expect(dialog.getByRole("alert")).toContainText("more than the ฿400");
    expect(posted).toHaveLength(0);

    await dialog.getByRole("spinbutton", { name: "Amount" }).fill("100");
    await dialog.getByRole("button", { name: "Take back" }).click();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toMatchObject({ accountId: 1, amount: 100 });
  });

  test("Escape closes the sheet and returns focus to the button that opened it", async ({ page }) => {
    await page.goto("/goals");
    const open = japan(page).getByRole("button", { name: "Add money" });
    await open.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("the Accounts page shows how much is set aside and available", async ({ page }) => {
    await page.goto("/accounts");
    await expect(page.getByText("฿400 set aside · ฿600 available")).toBeVisible();
  });

  test("Home shows the top goals and what is left to spend", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("region", { name: "Goals" });
    await expect(card).toContainText("Japan trip");
    await expect(card).toContainText("฿400 / ฿1,000");
    await expect(card).toContainText("฿400 set aside");
    await expect(card).toContainText("฿600 left to spend");
  });
});

test.describe("add transaction sheet and goal money (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("warns when an expense would dip into money set aside for goals", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });

    for (const k of ["5", "0", "0"]) await dialog.getByRole("button", { name: k, exact: true }).click();
    await expect(dialog.getByText(/more than the ฿600 available/)).toHaveCount(0);

    await dialog.getByRole("button", { name: "Delete" }).click();
    await dialog.getByRole("button", { name: "Delete" }).click();
    for (const k of ["7", "0", "0"]) await dialog.getByRole("button", { name: k, exact: true }).click();
    await expect(dialog.getByRole("status").filter({ hasText: "more than the ฿600 available" })).toBeVisible();
  });
});
