import { test, expect } from "@playwright/test";

test.describe("login page", () => {
  test("renders the sign-in form by default", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator(".login-brand")).toHaveText("NgernTong");
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
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

  test("has no horizontal overflow on a narrow phone (320px)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasOverflow).toBe(false);
  });

  test("shows the net worth cover panel on wide viewports and hides it below the breakpoint", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await expect(page.locator(".login-cover")).toBeVisible();

    await page.setViewportSize({ width: 700, height: 800 });
    await expect(page.locator(".login-cover")).toBeHidden();
  });

  test("toggles password visibility", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.getByPlaceholder("Min. 8 characters");
    await passwordInput.fill("supersecret");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide password" })).toBeVisible();
  });

  test("tab and login inputs are reachable and show a visible focus ring via keyboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").focus();
    await expect(page.getByPlaceholder("you@example.com")).toBeFocused();

    await page.keyboard.press("Tab");
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBeTruthy();

    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return getComputedStyle(el).boxShadow;
    });
    expect(outline).not.toBe("none");
  });
});
