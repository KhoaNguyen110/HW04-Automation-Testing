import { test, expect } from "@playwright/test";
import testData from "../data/login_data.json" assert { type: "json" };

const { config, credentials } = testData;
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

test.beforeEach(async ({ page }) => {
  await page.goto(config.login_url);
  await page.waitForLoadState("networkidle");
});

test.describe("FR-02: Reset login attempts", () => {
  test("TC-18: Reset attempts sau login thành công - bộ đếm về 0", async ({
    page,
  }) => {
    await page.goto(config.login_url);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${config.base_url}/`);

    await page.getByRole("button", { name: "Thoát" }).click();
    await page.goto(config.login_url);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${config.base_url}/`);
  });
});
