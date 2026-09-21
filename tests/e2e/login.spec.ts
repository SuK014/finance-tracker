import { test, expect } from "@playwright/test";

test.describe("login page", () => {
  test("renders the sign-in form by default", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Finance Tracker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("switches to the register form and back", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByPlaceholder("Repeat your password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();

    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByPlaceholder("Repeat your password")).toBeHidden();
  });

  test("shows a validation error for a short password", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill("test@example.com");
    await page.getByPlaceholder("Min. 8 characters").fill("short");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  });
});
