import { test, expect } from "@playwright/test";

// See home.spec.ts for why this runs against the isolated :3010 instance
// backed by the mock API server rather than the real database.
test.use({ baseURL: "http://localhost:3010" });

test.describe("quick-add category from the transaction form", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
  });

  test("renders without console errors and lists the existing category", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/transactions/new");

    await expect(page.getByRole("heading", { name: "Add Transaction" })).toBeVisible();
    const categoryTrigger = page.getByRole("button", { name: "Category" });
    await expect(categoryTrigger).toBeVisible();
    await categoryTrigger.click();
    await expect(page.getByRole("option", { name: "Groceries" })).toBeVisible();
    await expect(page.getByRole("option", { name: "+ Add new category…" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("selecting + Add new category reveals an inline form, not a nested <form>", async ({ page }) => {
    await page.goto("/transactions/new");

    await page.getByRole("button", { name: "Category" }).click();
    await page.getByRole("option", { name: "+ Add new category…" }).click();

    const nameInput = page.getByPlaceholder("New category name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeFocused();

    // The inline add UI must not be an actual <form> element, since it's
    // always rendered inside the page's own <form> — nested forms are
    // invalid HTML and cause submit-bubbling bugs.
    const formCount = await page.locator("form").count();
    expect(formCount).toBe(1);
  });

  test("creating a category auto-selects it and collapses back to the dropdown", async ({ page }) => {
    await page.goto("/transactions/new");

    await page.getByRole("button", { name: "Category" }).click();
    await page.getByRole("option", { name: "+ Add new category…" }).click();
    await page.getByPlaceholder("New category name").fill("Coffee");
    await page.getByRole("button", { name: "Add category" }).click();

    // Back to the custom select trigger, now showing the newly created
    // category selected by name — not just "some numeric value".
    const categoryTrigger = page.getByRole("button", { name: "Category" });
    await expect(categoryTrigger).toBeVisible();
    await expect(page.getByPlaceholder("New category name")).toHaveCount(0);
    await expect(categoryTrigger).toContainText("Coffee");
  });

  test("Escape cancels back to the dropdown without creating anything", async ({ page }) => {
    await page.goto("/transactions/new");

    await page.getByRole("button", { name: "Category" }).click();
    await page.getByRole("option", { name: "+ Add new category…" }).click();
    const nameInput = page.getByPlaceholder("New category name");
    await nameInput.fill("Should not be created");
    await nameInput.press("Escape");

    await expect(nameInput).toBeHidden();
    await expect(page.getByRole("button", { name: "Category" })).toBeVisible();
  });
});
