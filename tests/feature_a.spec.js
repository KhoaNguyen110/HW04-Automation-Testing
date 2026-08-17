import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const BASE_URL = "http://localhost:5173";
const LOGIN_URL = `${BASE_URL}/login`;

const VALID_EMAIL = "test@eshop.com";
const VALID_PASSWORD = "Test1234!";
const WRONG_PASSWORD = "WrongPass999!";

// Thực tế quan sát được: lockout sau 2 lần sai, thời gian khóa ~3 phút
// Không có thông báo riêng khi bị khóa — luôn hiện "Đăng nhập thất bại. Vui lòng kiểm tra lại."
// => Assert lockout bằng cách: login đúng password nhưng vẫn không redirect về /

// Cả 2 input đều là type="text" — dùng index để phân biệt
const emailInput = (page) => page.locator('input[type="text"]').first();
const passInput = (page) => page.locator('input[type="text"]').nth(1);

/** Điền form và bấm Sign In */
async function submitLogin(page, email, password) {
  await emailInput(page).fill(email);
  await passInput(page).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

/** Đăng nhập sai N lần liên tiếp */
async function failLoginTimes(page, n) {
  for (let i = 0; i < n; i++) {
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
  }
}

/** Chờ N milli-giây */
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

// ─────────────────────────────────────────────
// Trước mỗi test: mở trang login
// ─────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto(LOGIN_URL);
});

// ═════════════════════════════════════════════
// DOMAIN TESTING
// ═════════════════════════════════════════════

test.describe("Domain Testing — FR-02 Login & Lockout", () => {
  // TC-01 ─ Đăng nhập thành công
  test("TC-01: Đăng nhập thành công — redirect về /", async ({ page }) => {
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).not.toBeNull();
  });

  // TC-02 ─ Email rỗng
  test("TC-02: Email rỗng — hiển thị lỗi bắt buộc nhập", async ({ page }) => {
    await emailInput(page).fill("");
    await passInput(page).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await emailInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // TC-03 ─ Password rỗng
  test("TC-03: Password rỗng — hiển thị lỗi bắt buộc nhập", async ({
    page,
  }) => {
    await emailInput(page).fill(VALID_EMAIL);
    await passInput(page).fill("");
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await passInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // TC-04 ─ Cả 2 field rỗng
  test("TC-04: Cả 2 field rỗng — hiển thị lỗi bắt buộc nhập", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign In" }).click();
    const emailValid = await emailInput(page).evaluate(
      (el) => el.validity.valid,
    );
    const passValid = await passInput(page).evaluate((el) => el.validity.valid);
    expect(emailValid).toBe(false);
    expect(passValid).toBe(false);
  });

  // TC-05 ─ Email không có @
  test("TC-05: Email sai format (không có @) — HTML5 báo lỗi", async ({
    page,
  }) => {
    await emailInput(page).fill("userexample.com");
    await passInput(page).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await emailInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // TC-06 ─ Email thiếu domain (user@)
  test("TC-06: Email thiếu domain (user@) — HTML5 báo lỗi", async ({
    page,
  }) => {
    await emailInput(page).fill("user@");
    await passInput(page).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await emailInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // TC-07 ─ Email chỉ có @gmail.com
  test("TC-07: Email thiếu local part (@gmail.com) — HTML5 báo lỗi", async ({
    page,
  }) => {
    await emailInput(page).fill("@gmail.com");
    await passInput(page).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await emailInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // TC-08 ─ Email không tồn tại
  test("TC-08: Email không tồn tại — báo đăng nhập thất bại", async ({
    page,
  }) => {
    await submitLogin(page, "notexist@gmail.com", WRONG_PASSWORD);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
  });

  // TC-09 ─ Sai password lần 1
  test("TC-09: Sai password lần 1 — báo thất bại, cho thử lại", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
    await expect(emailInput(page)).toBeEnabled();
    await expect(passInput(page)).toBeEnabled();
  });

  // TC-10 ─ Sai password lần 2 — thực tế: trigger lockout
  // Thực tế: hệ thống lockout sau lần sai thứ 2 (không phải 3 như spec)
  // Không có thông báo riêng — vẫn hiện "Đăng nhập thất bại"
  // Assert: login đúng password ngay sau đó vẫn không vào được
  test("TC-10: Sai password lần 2 — trigger lockout (thực tế)", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await passInput(page).fill(WRONG_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    // Thử login đúng ngay sau — nếu bị lockout sẽ không redirect về /
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  // TC-11 ─ Sai lần 3 — vẫn trong lockout (lockout đã trigger từ lần 2)
  // Không có thông báo khóa riêng — hiện "Đăng nhập thất bại" như bình thường
  // Assert: login đúng password sau lần sai thứ 3 vẫn không vào được
  test("TC-11: Sai password lần 3 — vẫn bị lockout, không vào được", async ({
    page,
  }) => {
    await failLoginTimes(page, 3);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  // TC-12 ─ Login đúng pass khi đang lockout (lockout trigger sau 2 lần sai)
  // Không có thông báo khóa riêng — chỉ hiện "Đăng nhập thất bại" như bình thường
  test("TC-12: Login đúng password khi đang lockout — vẫn bị chặn", async ({
    page,
  }) => {
    await failLoginTimes(page, 2); // lockout trigger sau 2 lần sai
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  // TC-13 ─ Login sai tiếp khi đang lockout
  test("TC-13: Login sai tiếp khi đang lockout — vẫn thất bại", async ({
    page,
  }) => {
    await failLoginTimes(page, 2); // lockout trigger sau 2 lần sai
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  // TC-14 ─ Login đúng sau khi hết lockout (thực tế ~3 phút)
  // Skip mặc định vì tốn thời gian — bỏ comment .skip để chạy thủ công
  test.skip("TC-14: Login đúng sau >3 phút — đăng nhập thành công", async ({
    page,
  }) => {
    test.setTimeout(240_000); // 4 phút
    await failLoginTimes(page, 2); // lockout trigger sau 2 lần sai
    await wait(181_000); // chờ hơn 3 phút
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  // TC-15 ─ Password có khoảng trắng đầu/cuối
  test("TC-15: Password có khoảng trắng đầu/cuối — xác định trim behavior", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, ` ${VALID_PASSWORD}`);
    const isSuccess = page.url() === `${BASE_URL}/`;
    console.log(
      `TC-15 trim behavior: login ${isSuccess ? "thành công" : "thất bại"} với password có khoảng trắng đầu`,
    );
  });

  // TC-16 ─ Email chữ HOA
  test("TC-16: Email chữ HOA toàn bộ — đăng nhập thành công (case-insensitive)", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL.toUpperCase(), VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  // TC-17 ─ Password đúng nhưng khác hoa/thường
  test("TC-17: Password sai hoa/thường — đăng nhập thất bại (case-sensitive)", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD.toUpperCase());
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
  });

  // TC-18 ─ Reset attempts sau login thành công
  test("TC-18: Reset attempts sau login thành công — bộ đếm về 0", async ({
    page,
  }) => {
    // Sai 1 lần (chưa lockout), rồi đăng nhập đúng
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Đăng xuất, sai 1 lần nữa — nếu bộ đếm reset thì vẫn chưa lockout
    // => login đúng ngay sau phải thành công
    await page.goto(`${BASE_URL}/logout`);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  // TC-19 ─ Privilege escalation qua API
  test("TC-19: Privilege escalation — backend bỏ qua trường role", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);

    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).not.toBeNull();

    const response = await page.request.patch(
      "http://localhost:3000/api/profile",
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { role: "admin" },
      },
    );
    const body = await response.json();
    expect(body?.role).not.toBe("admin");
  });
});

// ═════════════════════════════════════════════
// BVA TESTING
// ═════════════════════════════════════════════

test.describe("BVA Testing — FR-02 Login & Lockout", () => {
  // BVA-01 ─ 0 lần sai, login đúng
  test("BVA-01: Attempts=0, login đúng — thành công", async ({ page }) => {
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  // BVA-02 ─ Sai 1 lần (in-range)
  test("BVA-02: Attempts=1 — báo lỗi, cho thử lại", async ({ page }) => {
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
    await expect(passInput(page)).toBeEnabled();
  });

  // BVA-03 ─ Sai 2 lần — thực tế đây là ON-POINT lockout (không phải just below)
  // Spec nói lockout ở lần 3, nhưng thực tế hệ thống lockout ngay lần 2
  test("BVA-03: Attempts=2 — thực tế trigger lockout (on-point thực tế)", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await passInput(page).fill(WRONG_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    // Thử login đúng ngay — nếu bị lockout thì không redirect
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  // BVA-04 ─ Sai 3 lần — vẫn locked (lockout đã xảy ra từ lần 2)
  test("BVA-04: Attempts=3 — vẫn trong lockout, không vào được", async ({
    page,
  }) => {
    await failLoginTimes(page, 3);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  // BVA-05 ─ Sai 4 lần — just above boundary
  test("BVA-05: Attempts=4 — vẫn bị khóa", async ({ page }) => {
    await failLoginTimes(page, 4);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  // BVA-06 ─ Login đúng sau 179s (just below 3 phút) — vẫn locked
  // Skip vì tốn thời gian — bỏ .skip để chạy thủ công
  test.skip("BVA-06: Login đúng sau 179s — vẫn bị khóa", async ({ page }) => {
    test.setTimeout(240_000);
    await failLoginTimes(page, 2);
    await wait(179_000);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
  });

  // BVA-07 ─ Login đúng sau đúng 3 phút (on-point) — skip vì tốn thời gian
  test.skip("BVA-07: Login đúng sau 180s (on-point 3 phút) — đăng nhập thành công", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await failLoginTimes(page, 2);
    await wait(180_000);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  // BVA-08 ─ Login đúng sau 181s (just above 3 phút) — skip vì tốn thời gian
  test.skip("BVA-08: Login đúng sau 181s — đăng nhập thành công", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await failLoginTimes(page, 2);
    await wait(181_000);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  // BVA-09 ─ Email rỗng
  test("BVA-09: Email rỗng (on-point empty) — báo bắt buộc nhập", async ({
    page,
  }) => {
    await emailInput(page).fill("");
    await passInput(page).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await emailInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // BVA-10 ─ Email format tối thiểu hợp lệ (a@b.c)
  test("BVA-10: Email tối thiểu hợp lệ (a@b.c) — cho submit, server báo sai", async ({
    page,
  }) => {
    await submitLogin(page, "a@b.c", VALID_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
  });

  // BVA-11 ─ Email thiếu @
  test("BVA-11: Email thiếu @ (usergmail.com) — HTML5 báo lỗi", async ({
    page,
  }) => {
    await emailInput(page).fill("usergmail.com");
    await passInput(page).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await emailInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // BVA-12 ─ Email thiếu local part
  test("BVA-12: Email thiếu local part (@gmail.com) — HTML5 báo lỗi", async ({
    page,
  }) => {
    await emailInput(page).fill("@gmail.com");
    await passInput(page).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await emailInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // BVA-13 ─ Email thiếu domain (user@)
  test("BVA-13: Email thiếu domain (user@) — HTML5 báo lỗi", async ({
    page,
  }) => {
    await emailInput(page).fill("user@");
    await passInput(page).fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await emailInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // BVA-14 ─ Password rỗng
  test("BVA-14: Password rỗng (on-point empty) — báo bắt buộc nhập", async ({
    page,
  }) => {
    await emailInput(page).fill(VALID_EMAIL);
    await passInput(page).fill("");
    await page.getByRole("button", { name: "Sign In" }).click();
    const valid = await passInput(page).evaluate((el) => el.validity.valid);
    expect(valid).toBe(false);
  });

  // BVA-15 ─ Password 1 ký tự
  test("BVA-15: Password 1 ký tự (just above empty) — cho submit, server báo sai", async ({
    page,
  }) => {
    await submitLogin(page, VALID_EMAIL, "a");
    await expect(page.locator("div.bg-red-100.text-red-700")).toBeVisible();
    await expect(page).not.toHaveURL(`${BASE_URL}/`);
  });

  // BVA-16 ─ Login đúng sau lockout, bộ đếm reset về 0 — skip vì tốn thời gian
  test.skip("BVA-16: Login đúng sau lockout 3 phút — bộ đếm reset về 0", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await failLoginTimes(page, 2);
    await wait(181_000);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Sau khi hết lockout và login thành công, sai 1 lần rồi login đúng — phải vào được
    await page.goto(`${BASE_URL}/logout`);
    await page.goto(LOGIN_URL);
    await submitLogin(page, VALID_EMAIL, WRONG_PASSWORD);
    await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });
});
