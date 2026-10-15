import { test, expect } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts).
// Fixture: "Savings bond 2020", ฿10,000 at 2.5% from 1 Jan 2020 to 1 Jan 2021 (matured, worth ฿10,250.68).
test.use({ baseURL: "http://localhost:3010" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

function capture(page: import("@playwright/test").Page, pattern: RegExp) {
  const bodies: Record<string, unknown>[] = [];
  page.on("request", r => {
    if (["POST", "PUT"].includes(r.method()) && pattern.test(r.url())) bodies.push(r.postDataJSON());
  });
  return bodies;
}

test.describe("bonds", () => {
  test("the portfolio lists a bond with what was paid, the rate, today's worth and the interest earned", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/portfolio");

    const bonds = page.getByRole("region", { name: "Bonds" });
    const row = bonds.getByRole("row", { name: /Savings bond 2020/ });
    await expect(row).toContainText("฿10,000.00");
    await expect(row).toContainText("2.5%");
    await expect(row).toContainText("1 Jan 2021 · Matured");
    await expect(row).toContainText("฿10,250.68");
    await expect(row).toContainText("+฿250.68");
    expect(errors).toEqual([]);
  });

  test("adding a bond sends its name, amount, rate and dates", async ({ page }) => {
    const sent = capture(page, /\/api\/bonds$/);
    await page.goto("/portfolio");
    await page.getByRole("button", { name: "+ Add a bond" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a bond" });

    await dialog.getByRole("textbox", { name: "Name" }).fill("Savings bond 2028");
    await dialog.getByRole("spinbutton", { name: "Amount paid" }).fill("20000");
    await dialog.getByRole("spinbutton", { name: "Interest rate per year" }).fill("2.75");
    // Type the maturity date in the date picker's own field.
    await dialog.getByRole("button", { name: "Choose date" }).nth(1).click();
    await dialog.getByRole("button", { name: "Next month" }).click();
    await dialog.getByRole("button", { name: /^\d+$/ }).first().click();
    await dialog.getByRole("button", { name: "Add bond" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toMatchObject({ name: "Savings bond 2028", principal: 20000, ratePct: 2.75 });
    expect(String(sent[0].maturityDate) > String(sent[0].startDate)).toBe(true);
  });

  test("a bond needs a name, an amount, a rate and a later maturity date", async ({ page }) => {
    const sent = capture(page, /\/api\/bonds$/);
    await page.goto("/portfolio");
    await page.getByRole("button", { name: "+ Add a bond" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a bond" });

    await dialog.getByRole("button", { name: "Add bond" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Give the bond a name.");
    await dialog.getByRole("textbox", { name: "Name" }).fill("X");
    await dialog.getByRole("button", { name: "Add bond" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Enter the amount you paid.");
    await dialog.getByRole("spinbutton", { name: "Amount paid" }).fill("1000");
    await dialog.getByRole("button", { name: "Add bond" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Enter the yearly interest rate");
    await dialog.getByRole("spinbutton", { name: "Interest rate per year" }).fill("2");
    await dialog.getByRole("button", { name: "Add bond" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Pick the maturity date.");
    expect(sent).toHaveLength(0);
  });

  test("net worth counts the bond among the baht holdings", async ({ page }) => {
    await page.goto("/net-worth");
    await expect(page.getByText("Savings bond 2020")).toBeVisible();
  });
});
