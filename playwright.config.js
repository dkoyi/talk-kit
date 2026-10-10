import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "browser.spec.js",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:8013",
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: "python3 -m http.server 8013 --bind 127.0.0.1",
    url: "http://127.0.0.1:8013",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore",
  },
  reporter: "list",
});
