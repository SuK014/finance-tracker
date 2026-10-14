import { test, expect } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts).
test.use({ baseURL: "http://localhost:3010" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

test.describe("add transaction sheet (390px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("the + button opens a bottom sheet with a keypad and saves a transaction", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", e => errors.push(e.message));

    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();

    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    await expect(dialog).toBeVisible();

    for (const k of ["8", "5"]) await dialog.getByRole("button", { name: k, exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "Amount" })).toHaveValue("85");

    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(dialog.getByRole("textbox", { name: "Amount" })).toHaveValue("8");
    await dialog.getByRole("button", { name: "5", exact: true }).click();

    await dialog.getByRole("button", { name: /Groceries/ }).click();
    await expect(dialog.getByRole("button", { name: /Groceries/ })).toHaveAttribute("aria-pressed", "true");

    await dialog.getByRole("button", { name: "Save transaction" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Transaction saved")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("shows a clear error instead of saving without an amount", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    await dialog.getByRole("button", { name: "Save transaction" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Enter an amount greater than 0.");
  });

  test("Escape closes the sheet and returns focus to the + button", async ({ page }) => {
    await page.goto("/");
    const fab = page.getByRole("button", { name: "Add transaction" });
    await fab.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(fab).toBeFocused();
  });

  test("a new category with an emoji can be created inline and is selected", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "+ New" }).click();
    await dialog.getByRole("button", { name: "Icon 🎮" }).click();
    await dialog.getByRole("textbox", { name: "New category name" }).fill("Games");
    await dialog.getByRole("button", { name: /Add .* category/ }).click();
    await expect(dialog.getByRole("button", { name: /Games/ })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("date and time pickers inside the sheet (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the time list opens inside the sheet, picking a time updates it, and Escape only closes the list", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });

    await dialog.getByRole("button", { name: "Choose time" }).click();
    const list = dialog.getByRole("listbox");
    await expect(list).toBeVisible();
    await expect(list).toBeInViewport({ ratio: 0.6 });

    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Choose time" }).click();
    await dialog.getByRole("option", { name: "9:30 AM" }).click();
    await expect(list).toBeHidden();
    await expect(dialog.getByRole("button", { name: "Choose time" })).toContainText("9:30 AM");
  });

  test("the time can be typed without opening the list", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });

    const field = dialog.getByRole("textbox", { name: /Type time/ });
    await expect(field).toBeVisible();
    await expect(dialog.getByRole("listbox")).toHaveCount(0);
    await field.fill("");
    await field.pressSequentially("2305");
    await expect(field).toHaveValue("23:05");
    await expect(dialog.getByRole("button", { name: "Choose time" })).toContainText("11:05 PM");
    await field.fill("");
    await field.pressSequentially("930");
    await expect(field).toHaveValue("09:30");
    await field.press("Enter");
    await expect(dialog.getByRole("button", { name: "Choose time" })).toContainText("9:30 AM");
    await expect(dialog.getByRole("listbox")).toHaveCount(0);
  });

  test("the date calendar opens inline and picking a day updates it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });

    const trigger = dialog.getByRole("button", { name: "Choose date" });
    await trigger.click();
    const calendar = dialog.getByRole("dialog", { name: "Choose date" });
    await expect(calendar).toBeVisible();
    await calendar.getByRole("button", { name: /^15$/ }).first().click();
    await expect(calendar).toBeHidden();
    await expect(trigger).toContainText(/^15 \w{3} \d{4}$/);
  });
});

test.describe("scan a slip", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a slip photo fills in the amount, note and date, then saves with the photo attached", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    await dialog.getByLabel("Slip photo").setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: png });

    await expect(dialog.getByRole("status")).toContainText("Filled in from your slip");
    await expect(dialog.getByRole("textbox", { name: "Amount" })).toHaveValue("250");
    await expect(dialog.getByLabel("Note")).toHaveValue("7-Eleven");

    await expect(dialog.getByText("Date", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Time", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /slip\.png/ })).toBeVisible();

    await dialog.getByRole("button", { name: "Save transaction" }).click();
    await expect(page.getByText("Transaction saved")).toBeVisible();
  });
});

test.describe("scan failure (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("explains a rate-limit failure instead of a generic message and keeps the form usable", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    await dialog.getByLabel("Slip photo").setInputFiles({ name: "limit.png", mimeType: "image/png", buffer: png });

    await expect(dialog.getByRole("alert")).toContainText("busy or its free limit is used up");
    await dialog.getByRole("button", { name: "5", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "Amount" })).toHaveValue("5");
  });
});

test.describe("add transaction dialog (1280px)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("sidebar button opens a centred dialog; typing the amount works without the keypad", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "+ Add transaction" }).click();
    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("group", { name: "Amount keypad" })).toBeHidden();

    const amount = dialog.getByRole("textbox", { name: "Amount" });
    await expect(amount).toBeFocused();
    await page.keyboard.type("120.5");
    await expect(amount).toHaveValue("120.5");

    const box = await dialog.boundingBox();
    const centre = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(Math.abs(centre - 640)).toBeLessThan(2);
  });
});
