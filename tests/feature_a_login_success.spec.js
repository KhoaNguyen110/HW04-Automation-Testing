import { test, expect } from "@playwright/test";
import testData from "../data/login_data.json" assert { type: "json" };

const { config, credentials, formatting_cases } = testData;

const VALID_EMAIL = credentials.valid_user.email;
const VALID_PASSWORD = credentials.valid_user.password;
const ADMIN_EMAIL = credentials.admin_user.email;
const ADMIN_PASS = credentials.admin_user.password;

const emailInput = (page) => page.locator('input[type="text"]').first();
const passInput = (page) => page.locator('input[type="text"]').nth(1);

async function submitLogin(page, email, password) {
  await emailInput(page).fill(email);
  await passInput(page).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto(config.login_url);
});

test.describe("FR-02: Valid Login & Normal Operations", () => {
  test("TC-01: Đăng nhập thành công - redirect về /", async ({ page }) => {
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${config.base_url}/`);
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).not.toBeNull();
  });

  test("TC-15: Password có khoảng trắng đầu/cuối - xác định trim behavior", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, ` ${VALID_PASSWORD}`);
    const isSuccess = page.url() === `${config.base_url}/`;
    console.log(
      `TC-15 trim behavior: login ${isSuccess ? "thành công" : "thất bại"} với password có khoảng trắng đầu`,
    );
  });

  for (const fmtCase of formatting_cases) {
    test(`${fmtCase.tc_id}: ${fmtCase.description}`, async ({ page }) => {
      const email =
        fmtCase.email_transform === "uppercase"
          ? VALID_EMAIL.toUpperCase()
          : VALID_EMAIL;
      const password =
        fmtCase.password_transform === "uppercase"
          ? VALID_PASSWORD.toUpperCase()
          : VALID_PASSWORD;

      await submitLogin(page, email, password);

      if (fmtCase.expect_success) {
        await expect(page).toHaveURL(`${config.base_url}/`);
      } else {
        await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
        await expect(page).not.toHaveURL(`${config.base_url}/`);
      }
    });
  }

  // ── SECURITY & PRIVILEGE ESCALATION TEST CASES (TC-19) ──
  test("TC-19a: Backend phải từ chối khi user thường PUT role=admin", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(config.login_url);

    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token, "Không tìm được token trong localStorage").not.toBeNull();

    const res = await page.request.put(config.api_endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { role: "admin" },
    });

    const body = await res.json().catch(() => ({}));
    expect(
      res.status(),
      `BUG-04: Backend chấp nhận PUT role=admin từ user thường (HTTP ${res.status()})`,
    ).not.toBe(200);

    if (body.role !== undefined) {
      expect(body.role, "BUG-04: Role bị thay đổi thành admin").not.toBe(
        "admin",
      );
    }
  });

  test("TC-19b: Sau khi escalate, đăng nhập Admin app bằng tài khoản user phải bị chặn", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(config.login_url);

    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token, "Không tìm được token").not.toBeNull();

    await page.request.put(config.api_endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { role: "admin" },
    });

    await page.goto(config.admin_login_url);
    await page.getByRole("textbox", { name: "Email" }).fill(VALID_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(VALID_PASSWORD);

    const adminLoginPromise = page.waitForResponse(
      (res) => res.url().includes("/api/") && res.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Login" }).click();

    const adminLoginRes = await adminLoginPromise;
    expect(
      adminLoginRes.status(),
      `BUG-04: User thường đã escalate role và đăng nhập thành công vào Admin API (HTTP ${adminLoginRes.status()})`,
    ).not.toBe(200);
  });

  test("TC-19c: Admin hợp lệ đăng nhập Admin app thành công", async ({
    page,
  }) => {
    await page.goto(config.admin_login_url);
    await page.getByRole("textbox", { name: "Email" }).fill(ADMIN_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASS);

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/login") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Login" }).click();

    const response = await loginResponsePromise;
    expect(response.ok()).toBeTruthy();
  });

  test("BVA-01: Attempts=0, login đúng - thành công", async ({ page }) => {
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${config.base_url}/`);
  });

  test("BVA-10: Email tối thiểu hợp lệ (a@b.c) - cho submit, server báo sai", async ({
    page,
  }) => {
    await submitLogin(page, "a@b.c", VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${config.base_url}/`);
  });
});
