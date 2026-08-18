import { test, expect } from "@playwright/test";
import testData from "../data/login_data.json" assert { type: "json" };

const { config, validation_cases } = testData;

const emailInput = (page) => page.locator('input[type="text"]').first();
const passInput = (page) => page.locator('input[type="text"]').nth(1);

test.beforeEach(async ({ page }) => {
  await page.goto(config.login_url);
});

test.describe("FR-02: Client-side & HTML5 Validation", () => {
  for (const data of validation_cases) {
    test(`${data.tc_id}: ${data.description}`, async ({ page }) => {
      await emailInput(page).fill(data.email);
      await passInput(page).fill(data.password);
      await page.getByRole("button", { name: "Sign In" }).click();

      if (data.check_field === "email" || data.check_field === "both") {
        const emailValid = await emailInput(page).evaluate(
          (el) => el.validity.valid,
        );
        expect(emailValid).toBe(false);
      }
      if (data.check_field === "password" || data.check_field === "both") {
        const passValid = await passInput(page).evaluate(
          (el) => el.validity.valid,
        );
        expect(passValid).toBe(false);
      }
    });
  }

  test("TC-08: Email không tồn tại - báo đăng nhập thất bại", async ({
    page,
  }) => {
    await emailInput(page).fill("notexist@gmail.com");
    await passInput(page).fill("WrongPass999!");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
    await expect(page).not.toHaveURL(`${config.base_url}/`);
  });
});
