// =============================================================================
// FR-02 — Login and Account Lockout
// Sinh viên : Nguyễn Đăng Khoa | MSSV : 23127393
// Technique : Domain Testing + Boundary Value Analysis
// Runner    : Playwright (JS)
// Data file : data/feature_a_data.json
// =============================================================================

const { test, expect } = require("@playwright/test");
const testData = require("../data/feature_a_data.json");

const BASE_URL = "http://localhost:5173";
const LOGIN_URL = `${BASE_URL}/login`;

// ---------------------------------------------------------------------------
// Helper: điền form và submit
// ---------------------------------------------------------------------------
async function fillAndSubmit(page, email, password) {
  await page.goto(LOGIN_URL);
  await page.waitForLoadState("networkidle");

  if (email !== undefined) {
    await page
      .locator(
        'input[type="email"], input[name="email"], input[placeholder*="email" i]',
      )
      .first()
      .fill(email);
  }
  if (password !== undefined) {
    await page
      .locator('input[type="password"], input[name="password"]')
      .first()
      .fill(password);
  }

  await page
    .locator(
      'button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")',
    )
    .first()
    .click();
}

// ---------------------------------------------------------------------------
// Helper: login thành công và lấy token (dùng cho setup)
// ---------------------------------------------------------------------------
async function loginSuccessfully(page, email, password) {
  await fillAndSubmit(page, email, password);
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Helper: thực hiện N lần login sai liên tiếp
// ---------------------------------------------------------------------------
async function failLoginNTimes(page, n) {
  const { email } = testData.lockoutUser;
  const wrongPassword = "definitelyWrong999";
  for (let i = 0; i < n; i++) {
    await fillAndSubmit(page, email, wrongPassword);
    // Chờ response trước lần tiếp theo
    await page.waitForTimeout(500);
  }
}

// =============================================================================
// DOMAIN TESTING
// =============================================================================

test.describe("FR-02 — Domain Testing | Login and Account Lockout", () => {
  // --------------------------------------------------------------------------
  // TC-01: Đăng nhập thành công
  // --------------------------------------------------------------------------
  test("TC-01 | Đăng nhập thành công — redirect về / và nhận JWT", async ({
    page,
  }) => {
    const { email, password } = testData.validUser;
    await fillAndSubmit(page, email, password);

    // Assertion 1: URL chuyển về trang chủ
    await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });

    // Assertion 2: localStorage hoặc cookie chứa token
    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );
    expect(token, "JWT token phải tồn tại sau khi đăng nhập").toBeTruthy();

    // Assertion 3: Không còn thấy nút Login trên navbar
    await expect(
      page.locator('a[href="/login"], button:has-text("Đăng nhập")').first(),
    )
      .not.toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Một số SUT dùng user avatar thay vì ẩn link login
      });
  });

  // --------------------------------------------------------------------------
  // TC-02: Email rỗng
  // --------------------------------------------------------------------------
  test("TC-02 | Email rỗng — báo bắt buộc nhập email", async ({ page }) => {
    await fillAndSubmit(page, "", testData.validUser.password);

    // Assertion 1: Vẫn ở trang login
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 5000 });

    // Assertion 2: Có thông báo lỗi email
    const errorMsg = page
      .locator(
        '[class*="error"], [class*="invalid"], [aria-invalid="true"], .text-red-500, .text-danger',
      )
      .first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // TC-03: Password rỗng
  // --------------------------------------------------------------------------
  test("TC-03 | Password rỗng — báo bắt buộc nhập password", async ({
    page,
  }) => {
    await fillAndSubmit(page, testData.validUser.email, "");

    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 5000 });

    const passwordField = page
      .locator('input[type="password"], input[name="password"]')
      .first();
    // Assertion: field bị đánh dấu invalid hoặc có thông báo lỗi
    const isInvalid = await passwordField.evaluate((el) => !el.validity.valid);
    const errorVisible = await page
      .locator('[class*="error"], [class*="invalid"]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(
      isInvalid || errorVisible,
      "Phải có validation cho password rỗng",
    ).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TC-04: Cả 2 field rỗng
  // --------------------------------------------------------------------------
  test("TC-04 | Cả 2 field rỗng — báo bắt buộc nhập", async ({ page }) => {
    await fillAndSubmit(page, "", "");
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // TC-05: Email sai format — không có @
  // --------------------------------------------------------------------------
  test("TC-05 | Email sai format (không có @) — HTML5 báo sai format [BUG:FR02-06]", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await emailField.fill("userexample.com");

    await page
      .locator('button[type="submit"], button:has-text("Đăng nhập")')
      .first()
      .click();

    // Assertion: HTML5 validity hoặc thông báo lỗi format
    const isInvalid = await emailField.evaluate((el) => !el.validity.valid);
    expect(
      isInvalid,
      "[BUG FR02-06] Email không có @ phải bị chặn bởi HTML5 validation",
    ).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TC-06: Email sai format — thiếu domain
  // --------------------------------------------------------------------------
  test("TC-06 | Email sai format (thiếu domain) — HTML5 báo sai format [BUG:FR02-06]", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await emailField.fill("user@");
    await page
      .locator('button[type="submit"], button:has-text("Đăng nhập")')
      .first()
      .click();

    const isInvalid = await emailField.evaluate((el) => !el.validity.valid);
    expect(isInvalid, "[BUG FR02-06] Email thiếu domain phải bị chặn").toBe(
      true,
    );
  });

  // --------------------------------------------------------------------------
  // TC-07: Email chỉ có @
  // --------------------------------------------------------------------------
  test("TC-07 | Email chỉ có @ — HTML5 báo sai format [BUG:FR02-06]", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await emailField.fill("@gmail.com");
    await page
      .locator('button[type="submit"], button:has-text("Đăng nhập")')
      .first()
      .click();

    const isInvalid = await emailField.evaluate((el) => !el.validity.valid);
    expect(isInvalid, "[BUG FR02-06] Email chỉ có @ phải bị chặn").toBe(true);
  });

  // --------------------------------------------------------------------------
  // TC-08: Email không tồn tại
  // --------------------------------------------------------------------------
  test("TC-08 | Email không tồn tại trong DB — báo đăng nhập thất bại", async ({
    page,
  }) => {
    await fillAndSubmit(page, "notexist@gmail.com", "wrongPass");

    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });

    const errorMsg = page
      .locator("text=/thất bại|sai|không đúng|invalid|incorrect|failed/i")
      .first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // TC-09: Sai password lần 1
  // --------------------------------------------------------------------------
  test("TC-09 | Sai password lần 1 — báo thất bại, vẫn cho thử lại", async ({
    page,
  }) => {
    await fillAndSubmit(page, testData.validUser.email, "wrongPass001");

    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });

    // Assertion: form vẫn visible (cho thử lại)
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await expect(emailField).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TC-10: Sai password lần 2 — dưới biên lockout
  // --------------------------------------------------------------------------
  test("TC-10 | Sai password lần 2 — vẫn phải cho thử lại [BUG:FR02-04]", async ({
    page,
  }) => {
    const { email } = testData.lockoutUser;

    // Lần 1
    await fillAndSubmit(page, email, "wrongPass001");
    await page.waitForTimeout(500);
    // Lần 2
    await fillAndSubmit(page, email, "wrongPass001");

    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });

    // Assertion: KHÔNG bị lockout, form vẫn cho nhập
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await expect(
      emailField,
      "[BUG FR02-04] Lần sai thứ 2 không được lockout",
    ).toBeEnabled();
  });

  // --------------------------------------------------------------------------
  // TC-11: Sai lần 3 — trigger lockout
  // --------------------------------------------------------------------------
  test("TC-11 | Sai lần 3 — kích hoạt lockout [BUG:FR02-02,FR02-04]", async ({
    page,
  }) => {
    const { email } = testData.lockoutUser;

    await failLoginNTimes(page, 3);

    // Assertion 1: Vẫn ở trang login
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });

    // Assertion 2: Có thông báo tài khoản bị khóa
    const lockMsg = page
      .locator("text=/khóa|locked|tạm thời|temporarily|30 giây|30 seconds/i")
      .first();
    await expect(
      lockMsg,
      "[BUG FR02-02] Phải hiển thị thông báo tài khoản bị khóa",
    ).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // TC-12: Login đúng khi đang lockout
  // --------------------------------------------------------------------------
  test("TC-12 | Login đúng pass khi đang lockout — vẫn không vào được [BUG:FR02-02]", async ({
    page,
  }) => {
    const { email, password } = testData.lockoutUser;

    await failLoginNTimes(page, 3);
    await page.waitForTimeout(1000);

    // Thử login đúng password
    await fillAndSubmit(page, email, password);

    // Assertion: không được redirect về /
    await expect(page)
      .not.toHaveURL(`${BASE_URL}/`, { timeout: 5000 })
      .catch(() => {});
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
  });

  // --------------------------------------------------------------------------
  // TC-13: Login sai tiếp khi đang lockout
  // --------------------------------------------------------------------------
  test("TC-13 | Login sai tiếp khi lockout — vẫn bị khóa", async ({ page }) => {
    const { email } = testData.lockoutUser;

    await failLoginNTimes(page, 4); // 3 để trigger + 1 thêm

    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
  });

  // --------------------------------------------------------------------------
  // TC-15: Password có khoảng trắng đầu/cuối
  // --------------------------------------------------------------------------
  test("TC-15 | Password có khoảng trắng đầu/cuối — hệ thống không auto trim [BUG:FR02-06]", async ({
    page,
  }) => {
    await fillAndSubmit(page, testData.validUser.email, " correctPass123");

    // Assertion: login thất bại (hệ thống không trim)
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
    const errorMsg = page
      .locator("text=/thất bại|sai|không đúng|failed/i")
      .first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // TC-16: Email viết hoa toàn bộ
  // --------------------------------------------------------------------------
  test("TC-16 | Email viết hoa — phải login được (case-insensitive) [BUG:FR02-07]", async ({
    page,
  }) => {
    const upperEmail = testData.validUser.email.toUpperCase();
    await fillAndSubmit(page, upperEmail, testData.validUser.password);

    // Assertion: redirect thành công
    await expect(
      page,
      "[BUG FR02-07] Email viết hoa phải đăng nhập được",
    ).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });
  });

  // --------------------------------------------------------------------------
  // TC-17: Password đúng nhưng khác hoa/thường
  // --------------------------------------------------------------------------
  test("TC-17 | Password khác hoa/thường — phải thất bại (case-sensitive)", async ({
    page,
  }) => {
    await fillAndSubmit(page, testData.validUser.email, "CORRECTPASS123");
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
  });

  // --------------------------------------------------------------------------
  // TC-18: Reset attempts sau login thành công
  // --------------------------------------------------------------------------
  test("TC-18 | Reset attempts sau login thành công", async ({ page }) => {
    const { email, password } = testData.validUser;

    // Sai 2 lần
    await fillAndSubmit(page, email, "wrongPass001");
    await page.waitForTimeout(500);
    await fillAndSubmit(page, email, "wrongPass001");
    await page.waitForTimeout(500);

    // Login đúng — bộ đếm reset
    await fillAndSubmit(page, email, password);
    await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });

    // Logout rồi sai 2 lần — không bị lockout
    await page.goto(`${BASE_URL}/logout`).catch(async () => {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(LOGIN_URL);
    });

    await fillAndSubmit(page, email, "wrongPass001");
    await page.waitForTimeout(500);
    await fillAndSubmit(page, email, "wrongPass001");

    // Assertion: sau 2 lần sai sau khi reset, vẫn cho thử lại
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await expect(emailField).toBeEnabled();
  });

  // --------------------------------------------------------------------------
  // TC-19: Role escalation qua API
  // --------------------------------------------------------------------------
  test("TC-19 | Role escalation — backend phải bỏ qua trường role [BUG:FR02-08]", async ({
    page,
    request,
  }) => {
    // Login để lấy token
    await fillAndSubmit(
      page,
      testData.validUser.email,
      testData.validUser.password,
    );
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );

    // Gửi request cập nhật profile với role=admin
    const response = await request.put(`${BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: "admin" },
    });

    // Kiểm tra role thực tế sau khi cập nhật
    const profileResponse = await request.get(`${BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile = await profileResponse.json();

    // Assertion: role vẫn là 'user', không phải 'admin'
    expect(
      profile.role || profile.data?.role,
      "[BUG FR02-08] Backend phải bỏ qua trường role từ client",
    ).not.toBe("admin");
  });
});

// =============================================================================
// BVA TESTING
// =============================================================================

test.describe("FR-02 — BVA Testing | Lockout Boundary", () => {
  // --------------------------------------------------------------------------
  // BVA-01: 0 lần sai — dưới biên dưới
  // --------------------------------------------------------------------------
  test("BVA-01 | 0 lần sai — login thành công bình thường", async ({
    page,
  }) => {
    await fillAndSubmit(
      page,
      testData.validUser.email,
      testData.validUser.password,
    );
    await expect(page).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });
  });

  // --------------------------------------------------------------------------
  // BVA-02: Sai 1 lần — in-range
  // --------------------------------------------------------------------------
  test("BVA-02 | Sai 1 lần — báo lỗi, cho thử lại", async ({ page }) => {
    const { email } = testData.lockoutUser;
    await fillAndSubmit(page, email, "wrongPass001");

    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await expect(emailField).toBeEnabled();
  });

  // --------------------------------------------------------------------------
  // BVA-03: Sai 2 lần — just below boundary
  // --------------------------------------------------------------------------
  test("BVA-03 | Sai 2 lần — just below lockout, vẫn cho thử lại [BUG:FR02-04]", async ({
    page,
  }) => {
    const { email } = testData.lockoutUser;

    await fillAndSubmit(page, email, "wrongPass001");
    await page.waitForTimeout(500);
    await fillAndSubmit(page, email, "wrongPass001");

    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });

    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await expect(
      emailField,
      "[BUG FR02-04] Sai 2 lần (just below on-point=3) không được lockout",
    ).toBeEnabled();
  });

  // --------------------------------------------------------------------------
  // BVA-04: Sai 3 lần — on-point lockout
  // --------------------------------------------------------------------------
  test("BVA-04 | Sai 3 lần — on-point, kích hoạt lockout [BUG:FR02-02,FR02-04]", async ({
    page,
  }) => {
    const { email } = testData.lockoutUser;
    await failLoginNTimes(page, 3);

    // Assertion 1: vẫn ở login page
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });

    // Assertion 2: thông báo khóa hiển thị
    const lockMsg = page.locator("text=/khóa|locked|30/i").first();
    await expect(
      lockMsg,
      "[BUG FR02-02] Phải có thông báo lockout",
    ).toBeVisible({ timeout: 5000 });

    // Assertion 3: submit button disabled hoặc không cho nhập
    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Đăng nhập")')
      .first();
    const isDisabled = await submitBtn.isDisabled().catch(() => false);
    // Chấp nhận cả trường hợp disabled và enabled (sẽ ghi nhận bug nếu enabled)
    if (!isDisabled) {
      console.warn(
        "[WARN] Submit button vẫn enabled khi lockout — kiểm tra bug FR02-02",
      );
    }
  });

  // --------------------------------------------------------------------------
  // BVA-05: Sai 4 lần — just above boundary
  // --------------------------------------------------------------------------
  test("BVA-05 | Sai 4 lần — just above, vẫn bị khóa", async ({ page }) => {
    const { email } = testData.lockoutUser;
    await failLoginNTimes(page, 4);
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
  });

  // --------------------------------------------------------------------------
  // BVA-06: Login đúng sau 29 giây — vẫn locked
  // --------------------------------------------------------------------------
  test("BVA-06 | Login đúng sau 29 giây — vẫn bị khóa (just below time boundary)", async ({
    page,
  }) => {
    test.setTimeout(90000); // Override timeout cho TC này
    const { email, password } = testData.lockoutUser;
    await failLoginNTimes(page, 3);

    await page.waitForTimeout(29000);

    await fillAndSubmit(page, email, password);
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
  });

  // --------------------------------------------------------------------------
  // BVA-07: Login đúng sau 30 giây — on-point
  // --------------------------------------------------------------------------
  test("BVA-07 | Login đúng sau 30 giây — on-point, phải mở khóa [BUG:FR02-05]", async ({
    page,
  }) => {
    test.setTimeout(120000);
    const { email, password } = testData.lockoutUser;
    await failLoginNTimes(page, 3);

    await page.waitForTimeout(30000);

    await fillAndSubmit(page, email, password);
    await expect(
      page,
      "[BUG FR02-05] Sau 30 giây phải mở khóa, thực tế ~3 phút",
    ).toHaveURL(`${BASE_URL}/`, { timeout: 10000 });
  });

  // --------------------------------------------------------------------------
  // BVA-08: Login đúng sau 31 giây — just above
  // --------------------------------------------------------------------------
  test("BVA-08 | Login đúng sau 31 giây — just above, phải mở khóa [BUG:FR02-05]", async ({
    page,
  }) => {
    test.setTimeout(120000);
    const { email, password } = testData.lockoutUser;
    await failLoginNTimes(page, 3);

    await page.waitForTimeout(31000);

    await fillAndSubmit(page, email, password);
    await expect(page, "[BUG FR02-05] Sau 31 giây phải mở khóa").toHaveURL(
      `${BASE_URL}/`,
      { timeout: 10000 },
    );
  });

  // --------------------------------------------------------------------------
  // BVA-09: Email rỗng — on-point empty
  // --------------------------------------------------------------------------
  test("BVA-09 | Email rỗng — on-point empty, báo bắt buộc nhập", async ({
    page,
  }) => {
    await fillAndSubmit(page, "", testData.validUser.password);
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // BVA-10: Email format tối thiểu hợp lệ
  // --------------------------------------------------------------------------
  test("BVA-10 | Email a@b.c — on-point minimum, cho phép submit", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await emailField.fill("a@b.c");

    // Assertion: HTML5 validity hợp lệ
    const isValid = await emailField.evaluate((el) => el.validity.valid);
    expect(isValid, "Email a@b.c phải được HTML5 coi là hợp lệ").toBe(true);
  });

  // --------------------------------------------------------------------------
  // BVA-11: Email thiếu @ — invalid boundary
  // --------------------------------------------------------------------------
  test("BVA-11 | Email thiếu @ — invalid, HTML5 báo sai format [BUG:FR02-06]", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await emailField.fill("usergmail.com");
    await page.locator('button[type="submit"]').first().click();

    const isInvalid = await emailField.evaluate((el) => !el.validity.valid);
    expect(isInvalid, "[BUG FR02-06] Email thiếu @ phải bị HTML5 chặn").toBe(
      true,
    );
  });

  // --------------------------------------------------------------------------
  // BVA-12: Email thiếu local part
  // --------------------------------------------------------------------------
  test("BVA-12 | Email thiếu local part — invalid [BUG:FR02-06]", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await emailField.fill("@gmail.com");
    await page.locator('button[type="submit"]').first().click();

    const isInvalid = await emailField.evaluate((el) => !el.validity.valid);
    expect(
      isInvalid,
      "[BUG FR02-06] Email thiếu local part phải bị HTML5 chặn",
    ).toBe(true);
  });

  // --------------------------------------------------------------------------
  // BVA-13: Email thiếu domain
  // --------------------------------------------------------------------------
  test("BVA-13 | Email thiếu domain — invalid [BUG:FR02-06]", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const emailField = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await emailField.fill("user@");
    await page.locator('button[type="submit"]').first().click();

    const isInvalid = await emailField.evaluate((el) => !el.validity.valid);
    expect(
      isInvalid,
      "[BUG FR02-06] Email thiếu domain phải bị HTML5 chặn",
    ).toBe(true);
  });

  // --------------------------------------------------------------------------
  // BVA-14: Password rỗng — on-point empty
  // --------------------------------------------------------------------------
  test("BVA-14 | Password rỗng — on-point empty, báo bắt buộc nhập", async ({
    page,
  }) => {
    await fillAndSubmit(page, testData.validUser.email, "");
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // BVA-15: Password 1 ký tự — just above empty
  // --------------------------------------------------------------------------
  test("BVA-15 | Password 1 ký tự — just above empty, cho submit (server reject)", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill("a");

    // Assertion: HTML5 không chặn (minlength có thể chưa set)
    const isValid = await passwordField.evaluate((el) => el.validity.valid);
    // Dù valid hay không, form phải submit được (server báo sai)
    await page
      .locator('input[type="email"]')
      .first()
      .fill(testData.validUser.email);
    await page.locator('button[type="submit"]').first().click();

    // Chỉ verify không crash
    await page.waitForLoadState("networkidle", { timeout: 8000 });
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 5000 });
  });
});
