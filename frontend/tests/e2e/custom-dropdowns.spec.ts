import { test, expect } from "@playwright/test";

// See home.spec.ts for why this runs against the isolated :3010 instance
// backed by the mock API server rather than the real database. All three
// custom components (Select, DatePicker, TimePicker) are exercised via the
// Add Transaction form, which uses all three.
test.use({ baseURL: "http://localhost:3010" });

test.describe("custom Select", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
  });

  test("opens on click, selects an option, and closes", async ({ page }) => {
    await page.goto("/transactions/new");

    const accountTrigger = page.getByRole("button", { name: "Account" });
    await accountTrigger.click();
    await expect(page.getByRole("option", { name: "Kasikorn" })).toBeVisible();

    await page.getByRole("option", { name: "Kasikorn" }).click();
    await expect(accountTrigger).toContainText("Kasikorn");
    await expect(page.getByRole("option", { name: "Kasikorn" })).toBeHidden();
  });

  test("is keyboard operable: arrow keys move, Enter selects, Escape closes", async ({ page }) => {
    await page.goto("/transactions/new");

    const typeTrigger = page.getByRole("button", { name: "Transaction type" });
    await typeTrigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option", { name: "Income" })).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(typeTrigger).toContainText("Income");

    await typeTrigger.press("Enter");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("option", { name: "Expense" })).toBeHidden();
  });

  test("closes when clicking outside", async ({ page }) => {
    await page.goto("/transactions/new");

    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByRole("option", { name: "Kasikorn" })).toBeVisible();

    await page.getByRole("heading", { name: "Add Transaction" }).click();
    await expect(page.getByRole("option", { name: "Kasikorn" })).toBeHidden();
  });
});

test.describe("custom DatePicker", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
  });

  test("opens a calendar and selecting a day sets the value", async ({ page }) => {
    await page.goto("/transactions/new");

    const dateTrigger = page.getByRole("button", { name: "Choose date" });
    await dateTrigger.click();
    await expect(page.getByRole("dialog", { name: "Choose date" })).toBeVisible();

    await page.getByRole("button", { name: "15", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Choose date" })).toBeHidden();
    await expect(dateTrigger).toContainText("15");
  });

  test("month navigation moves the displayed month", async ({ page }) => {
    await page.goto("/transactions/new");

    await page.getByRole("button", { name: "Choose date" }).click();
    const titleBefore = await page.locator(".datepicker-title").textContent();

    await page.getByRole("button", { name: "Next month" }).click();
    const titleAfter = await page.locator(".datepicker-title").textContent();

    expect(titleAfter).not.toBe(titleBefore);
  });

  test("Today and Clear controls work", async ({ page }) => {
    await page.goto("/transactions/new");

    const dateTrigger = page.getByRole("button", { name: "Choose date" });
    await dateTrigger.click();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(dateTrigger).toContainText("Select date");

    await dateTrigger.click();
    await page.getByRole("button", { name: "Today" }).click();
    await expect(dateTrigger).not.toContainText("Select date");
  });
});

test.describe("custom TimePicker", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "token", value: "test-fake-token", url: "http://localhost:3010" },
    ]);
  });

  test("opens a time list and selecting an entry sets the value", async ({ page }) => {
    await page.goto("/transactions/new");

    const timeTrigger = page.getByRole("button", { name: "Choose time" });
    await timeTrigger.click();
    await page.getByRole("option", { name: "9:00 AM" }).click();
    await expect(timeTrigger).toContainText("9:00 AM");
  });

  test("exact time can be typed in the custom field", async ({ page }) => {
    await page.goto("/transactions/new");

    const timeTrigger = page.getByRole("button", { name: "Choose time" });
    // The typing field is always visible: no need to open the list first.
    const customInput = page.getByRole("textbox", { name: /Type time/ });
    await expect(customInput).toBeVisible();
    await customInput.fill("");
    await customInput.pressSequentially("1437");
    await expect(customInput).toHaveValue("14:37");
    await customInput.press("Enter");
    await expect(timeTrigger).toContainText("2:37 PM");
  });
});
