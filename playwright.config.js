import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["html", { outputFolder: "html-reports", open: "never" }]],
  use: {
    /* Đổi thành URL chạy thực tế của EShop */
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
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
