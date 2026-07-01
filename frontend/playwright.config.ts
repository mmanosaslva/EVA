import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { outputFolder: "e2e-report" }]]
    : [["list"], ["html", { outputFolder: "e2e-report" }]],
  use: {
    baseURL: process.env.CI ? "http://localhost:4173" : "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run preview" : "npm run dev",
    url: process.env.CI ? "http://localhost:4173" : "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  timeout: 120000,
});
