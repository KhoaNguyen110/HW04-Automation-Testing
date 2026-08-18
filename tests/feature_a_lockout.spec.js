import { test, expect } from "@playwright/test";
import testData from "../data/login_data.json";

const { config, credentials, lockout_time_cases } = testData;
const VALID_EMAIL = credentials.valid_user.email;
const VALID_PASSWORD = credentials.valid_user.password;
const WRONG_PASSWORD = credentials.wrong_password;

const emailInput = (page) => page.locator('input[type="text"]').first();
const passInput = (page) => page.locator('input[type="text"]').nth(1);

async function submitLogin(page, email, password) {
  await emailInput(page).fill(email);
  await passInput(page).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

async function failLoginTimes(page, n) {
  for (let i = 0; i < n; i++) {
    await page.goto(config.login_url);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
  }
}

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

test.beforeEach(async ({ page }) => {
  await page.goto(config.login_url);
  await page.waitForLoadState("networkidle");
});

test.describe("FR-02: Invalid Credentials & Lockout Mechanics", () => {
  test("TC-09 / BVA-02: Sai password lần 1 - báo thất bại, cho thử lại", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
    await expect(emailInput(page)).toBeEnabled();
    await expect(passInput(page)).toBeEnabled();

    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${config.login_url}/`);
  });

  test("BVA-15: Password 1 ký tự (just above empty) - cho submit, server báo sai", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, "a");
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
    await expect(page).not.toHaveURL(`${config.base_url}/`);
  });

  test("TC-10 / BVA-03: Sai password lần 2 - trigger lockout (thực tế)", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await passInput(page).fill(WRONG_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${config.base_url}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  test("TC-11 / BVA-04: Sai password lần 3 - vẫn bị lockout, không vào được", async ({
    page,
  }) => {
    await failLoginTimes(page, 3);
    await page.goto(config.login_url);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${config.base_url}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  test("TC-12: Login đúng password khi đang lockout - vẫn bị chặn", async ({
    page,
  }) => {
    await failLoginTimes(page, 2);
    await page.goto(config.login_url);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${config.base_url}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  test("TC-13 / BVA-05: Login sai tiếp khi đang lockout - vẫn thất bại", async ({
    page,
  }) => {
    await failLoginTimes(page, 2);
    await page.goto(config.login_url);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await expect(page).not.toHaveURL(`${config.base_url}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  for (const timeCase of lockout_time_cases) {
    test(`${timeCase.tc_id}: ${timeCase.description}`, async ({ page }) => {
      test.setTimeout(240_000);
      await failLoginTimes(page, 2);
      await wait(timeCase.wait_seconds * 1000);
      await page.goto(config.login_url);
      await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);

      if (timeCase.expect_success) {
        await expect(page).toHaveURL(`${config.base_url}/`);
      } else {
        await expect(page).not.toHaveURL(`${config.base_url}/`);
        await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
      }
    });
  }

  test("BVA-16: Login đúng sau lockout 3 phút - bộ đếm reset về 0", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await failLoginTimes(page, 2);
    await wait(181_000);
    await page.goto(config.login_url);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${config.base_url}/`);

    await page.goto(`${config.base_url}/logout`);
    await page.goto(config.login_url);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${config.base_url}/`);
  });
});
