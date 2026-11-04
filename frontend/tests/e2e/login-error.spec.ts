import { test, expect } from "@playwright/test";

// The deployed site once spun on "Please wait…" forever when the browser blocked the sign-in request.
test.use({ baseURL: "http://localhost:3010" });

test("when the server can't be reached, sign-in says so and the button works again", async ({ page }) => {
  await page.route("**/api/auth/login", route => route.abort("failed"));
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill("someone@example.com");
  await page.locator('input[type="password"]').fill("password123");
  const submit = page.locator('form button[type="submit"]');
  await submit.click();
  await expect(page.getByText("Can't reach the server. It may be waking up, so try again in a minute.")).toBeVisible();
  await expect(submit).toBeEnabled();
});
