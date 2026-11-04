import { test, expect, type Page } from "@playwright/test";

// Runs against the isolated :3010 instance + mock API (see home.spec.ts). The Note field suggests notes you used
// before, in a list that follows the theme (the browser's own list is white in dark mode).
test.use({ baseURL: "http://localhost:3010" });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "token", value: "test-fake-token", url: "http://localhost:3010" }]);
});

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

async function mockHistory(page: Page) {
  const rows = ["Grab", "Card", "france fried", "KFC", "Water", "ตรงข้ามหอ", "Grab"].map((description, i) => ({
    id: i + 1, amount: 50, type: "expense", description, date: `2026-11-0${Math.min(i + 1, 4)}T12:00:00.000+07:00`, accountId: 1, categoryId: 1,
  }));
  await page.route("**/api/transactions", route => {
    const method = route.request().method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (method !== "GET") return route.continue();
    return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(rows) });
  });
}

async function openSheet(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Add transaction" }).click();
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("scrollbars are slim and lavender, not the browser's default", async ({ page }) => {
  await page.goto("/login");
  const bar = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      width: getComputedStyle(root, "::-webkit-scrollbar").width,
      thumbRadius: getComputedStyle(root, "::-webkit-scrollbar-thumb").borderRadius,
      thumb: getComputedStyle(root, "::-webkit-scrollbar-thumb").backgroundColor,
    };
  });
  expect(bar.width).toBe("12px");
  expect(parseFloat(bar.thumbRadius)).toBeGreaterThan(100); // fully rounded
  expect(bar.thumb).not.toBe("rgba(0, 0, 0, 0)"); // has the tinted lavender colour
});

test.describe("note suggestions", () => {
  test("suggests earlier notes, narrows as you type, and picks one with the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockHistory(page);
    const dialog = await openSheet(page);
    const note = dialog.getByRole("combobox", { name: "Note" });

    await note.focus();
    const list = dialog.getByRole("listbox", { name: "Notes you used before" });
    await expect(list.getByRole("option")).toHaveCount(6); // distinct notes, at most six
    await expect(list.getByRole("option", { name: "Grab" })).toHaveCount(1); // a repeated note is listed once

    await note.pressSequentially("fr");
    await expect(list.getByRole("option")).toHaveText(["france fried"]);

    await page.keyboard.press("ArrowDown");
    await expect(list.getByRole("option", { name: "france fried" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(note).toHaveValue("france fried");
    await expect(list).toHaveCount(0);
    // Enter picked the note; it did not save the transaction
    await expect(dialog).toBeVisible();
  });

  test("a tap picks a note, and Escape closes the list before it closes the sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockHistory(page);
    const dialog = await openSheet(page);
    const note = dialog.getByRole("combobox", { name: "Note" });

    await note.focus();
    const list = dialog.getByRole("listbox", { name: "Notes you used before" });
    await expect(list).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
    await expect(dialog).toBeVisible();

    await note.click();
    await dialog.getByRole("option", { name: "KFC" }).click();
    await expect(note).toHaveValue("KFC");
    await expect(dialog).toBeVisible();
  });

  test("in dark mode the list and the browser's own controls follow the theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 390, height: 844 });
    await mockHistory(page);
    const dialog = await openSheet(page);
    await dialog.getByRole("combobox", { name: "Note" }).focus();
    const list = dialog.getByRole("listbox", { name: "Notes you used before" });
    await expect(list).toBeVisible();

    const look = await list.evaluate(el => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, scheme: getComputedStyle(document.documentElement).colorScheme };
    });
    expect(look.bg).toBe("rgb(38, 40, 77)"); // --surface-raised in dark mode, not white
    expect(look.scheme).toBe("dark"); // scrollbars and other native controls turn dark with it
  });
});
