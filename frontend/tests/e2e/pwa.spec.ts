import { test, expect } from "@playwright/test";

test.describe("PWA installability", () => {
  test("serves a valid web app manifest with both icons", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();

    const manifest = await res.json();
    expect(manifest.name).toBe("NgernTong");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icon", sizes: "512x512" }),
        expect.objectContaining({ src: "/apple-icon", sizes: "180x180" }),
      ])
    );
  });

  test("serves the icon and apple-icon as PNG images", async ({ request }) => {
    const icon = await request.get("/icon");
    expect(icon.ok()).toBeTruthy();
    expect(icon.headers()["content-type"]).toContain("image/png");

    const appleIcon = await request.get("/apple-icon");
    expect(appleIcon.ok()).toBeTruthy();
    expect(appleIcon.headers()["content-type"]).toContain("image/png");
  });

  test("links the manifest and apple-touch-icon in the page head", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest"
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#6a5ae0"
    );
  });
});
