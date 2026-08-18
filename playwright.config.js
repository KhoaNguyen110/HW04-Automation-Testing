import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [
    [
      "html",
      {
        outputFolder: "html-reports",
        open: "never",
        title: `EShop Test Report — Run by: 23127393 | ${new Date().toISOString()}`,
      },
    ],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  metadata: {
    "Run by": "23127393",
    "Executed at": new Date().toISOString(),
  },
  /* Khai báo danh sách trình duyệt (Projects) */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
