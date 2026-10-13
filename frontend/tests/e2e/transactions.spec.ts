import { test, expect } from "@playwright/test";

// See home.spec.ts for why this runs against the isolated :3010 instance
// backed by the mock API server rather than the real database.
test.use({ baseURL: "http://localhost:3010" });

test.describe("transactions page (redesigned)", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
  });

  test("renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/transactions");

    await expect(page.getByRole("heading", { name: "Transactions", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("search input filters the transaction list (primary flow)", async ({ page }) => {
    await page.goto("/transactions");

    const search = page.getByRole("searchbox", { name: "Search by description, category, or account" });
    await expect(search).toBeVisible();

    // Matches the fixture transaction's category ("Groceries")
    await search.fill("groceries");
    await expect(page.getByText("Whole Foods")).toBeVisible();

    // Matches nothing
    await search.fill("nonexistent-merchant-xyz");
    await expect(page.getByText("No transactions match your search.")).toBeVisible();
  });

  test("search input and add-transaction button are keyboard reachable and the button opens the sheet", async ({ page }) => {
    await page.goto("/transactions");

    const search = page.getByRole("searchbox", { name: "Search by description, category, or account" });
    await search.focus();
    await expect(search).toBeFocused();

    const addButton = page.getByRole("main").getByRole("button", { name: "+ Add transaction" });
    await addButton.focus();
    await expect(addButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Add transaction" })).toBeVisible();
  });
});
