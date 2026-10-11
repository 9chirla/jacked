import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Pixel 7"],
    viewport: { width: 360, height: 800 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000/offline",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
