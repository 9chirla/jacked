import { expect, test } from "@playwright/test";

test.describe("offline matrix smoke", () => {
  test("offline fallback page documents queued writes", async ({ page }) => {
    await page.goto("/offline");
    await expect(
      page.getByRole("heading", { name: "You are offline" }),
    ).toBeVisible();
    await expect(page.getByText(/queue to the outbox/i)).toBeVisible();
    await expect(
      page.getByText(/Settings → Offline & install/i),
    ).toBeVisible();
  });

  test("document stays usable after network drop without reload", async ({
    page,
    context,
  }) => {
    await page.goto("/offline");
    await expect(
      page.getByRole("heading", { name: "You are offline" }),
    ).toBeVisible();
    await context.setOffline(true);
    // In-memory document (no navigation) remains; cold reload without SW
    // is explicitly not claimed.
    await expect(
      page.getByRole("heading", { name: "You are offline" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Try Today again/i })).toBeVisible();
  });
});
