import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8081",
    channel: "chrome",
    trace: "retain-on-failure",
    locale: "fr-FR",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:8081",
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile-web",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
