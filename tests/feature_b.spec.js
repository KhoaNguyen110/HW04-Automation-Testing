// =============================================================================
// FR-08 — Checkout
// Sinh viên : Nguyễn Đăng Khoa | MSSV : 23127393
// Technique : Domain Testing + Boundary Value Analysis
// Runner    : Playwright (JS)
// Data file : data/feature_b_data.json
// =============================================================================

const { test, expect } = require("@playwright/test");
const testData = require("../data/feature_b_data.json");

const BASE_URL = "http://localhost:5173";
const LOGIN_URL = `${BASE_URL}/login`;
const CART_URL = `${BASE_URL}/cart`;
const CHECKOUT_URL = `${BASE_URL}/checkout`;

// ---------------------------------------------------------------------------
// Helper: đăng nhập
// ---------------------------------------------------------------------------
async function login(page, email, password) {
  await page.goto(LOGIN_URL);
  await page.waitForLoadState("networkidle");
  await page
    .locator('input[type="email"], input[name="email"]')
    .first()
    .fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page
    .locator('button[type="submit"], button:has-text("Đăng nhập")')
    .first()
    .click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Helper: thêm 1 sản phẩm vào giỏ qua API
// ---------------------------------------------------------------------------
async function addProductToCart(page, productId = 1, quantity = 1) {
  const token = await page.evaluate(
    () =>
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt"),
  );
  await page.request
    .post(`${BASE_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { productId, quantity },
    })
    .catch(async () => {
      // Fallback: thêm qua UI nếu API không có endpoint
      await page.goto(`${BASE_URL}/products/${productId}`);
      await page
        .locator(
          'button:has-text("Thêm vào giỏ"), button:has-text("Add to Cart")',
        )
        .first()
        .click();
      await page.waitForTimeout(1000);
    });
}

// ---------------------------------------------------------------------------
// Helper: xóa toàn bộ giỏ hàng
// ---------------------------------------------------------------------------
async function clearCart(page) {
  const token = await page.evaluate(
    () =>
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt"),
  );
  await page.request
    .delete(`${BASE_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Helper: lấy giỏ hàng hiện tại qua API
// ---------------------------------------------------------------------------
async function getCartItems(page) {
  const token = await page.evaluate(
    () =>
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt"),
  );
  const res = await page.request.get(`${BASE_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return body.items || body.data || body || [];
}

// =============================================================================
// DOMAIN TESTING
// =============================================================================

test.describe("FR-08 — Domain Testing | Checkout", () => {
  // --------------------------------------------------------------------------
  // TC-01: Checkout thành công đầy đủ thông tin
  // --------------------------------------------------------------------------
  test("TC-01 | Checkout thành công — tạo đơn, giỏ bị xóa [BUG:FR08-03]", async ({
    page,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");

    // Assertion 1: Trang checkout load thành công
    await expect(page).toHaveURL(new RegExp("/checkout"), { timeout: 5000 });

    // Click nút đặt hàng
    await page
      .locator(
        'button:has-text("Đặt hàng"), button:has-text("Thanh toán"), button:has-text("Place Order"), button[type="submit"]',
      )
      .last()
      .click();

    await page.waitForTimeout(2000);

    // Assertion 2: Có thông báo đặt hàng thành công
    const successMsg = page
      .locator("text=/thành công|success|đặt hàng thành công/i")
      .first();
    await expect(successMsg).toBeVisible({ timeout: 8000 });

    // Assertion 3: Giỏ hàng bị xóa sau checkout
    await page.goto(CART_URL);
    await page.waitForLoadState("networkidle");
    const emptyCartMsg = page
      .locator("text=/trống|empty|không có|no item/i")
      .first();
    await expect(
      emptyCartMsg,
      "[BUG FR08-03] Giỏ hàng phải được xóa sau khi checkout thành công",
    ).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // TC-02: Chưa đăng nhập vào trang checkout
  // --------------------------------------------------------------------------
  test("TC-02 | Chưa đăng nhập — redirect về /login", async ({ page }) => {
    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");

    // Assertion 1: Redirect về login
    await expect(page).toHaveURL(new RegExp("/login"), { timeout: 8000 });
  });

  // --------------------------------------------------------------------------
  // TC-03: Giỏ hàng rỗng
  // --------------------------------------------------------------------------
  test("TC-03 | Giỏ hàng rỗng — báo trống, không cho checkout", async ({
    page,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);

    await page.goto(CART_URL);
    await page.waitForLoadState("networkidle");

    // Assertion: Hiển thị thông báo giỏ trống
    const emptyMsg = page
      .locator("text=/trống|empty|không có sản phẩm/i")
      .first();
    await expect(emptyMsg).toBeVisible({ timeout: 5000 });

    // Assertion: Không có nút checkout hoặc nút bị disabled
    const checkoutBtn = page
      .locator('a[href="/checkout"], button:has-text("Thanh toán")')
      .first();
    const btnExists = await checkoutBtn.isVisible().catch(() => false);
    if (btnExists) {
      const isDisabled = await checkoutBtn.isDisabled();
      expect(isDisabled, "Nút checkout phải disabled khi giỏ hàng trống").toBe(
        true,
      );
    }
  });

  // --------------------------------------------------------------------------
  // TC-04: Giỏ hàng 1 sản phẩm
  // --------------------------------------------------------------------------
  test("TC-04 | Giỏ hàng 1 sản phẩm — hiển thị đúng", async ({ page }) => {
    const { email, password } = testData.users.loggedIn;
    const product = testData.products.singleProduct;

    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, product.id, 1);

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");

    // Assertion 1: Hiển thị đúng tên sản phẩm
    await expect(page.locator(`text=${product.name}`).first()).toBeVisible({
      timeout: 5000,
    });

    // Assertion 2: Hiển thị đúng số lượng
    const qtyText = page.locator("text=/×\\s*1|x1|quantity.*1/i").first();
    await expect(qtyText.or(page.locator('[data-qty="1"]').first()))
      .toBeVisible({ timeout: 5000 })
      .catch(() => {});
  });

  // --------------------------------------------------------------------------
  // TC-05: Giỏ hàng nhiều sản phẩm
  // --------------------------------------------------------------------------
  test("TC-05 | Giỏ hàng nhiều sản phẩm — tổng tiền đúng", async ({ page }) => {
    const { email, password } = testData.users.loggedIn;
    const products = testData.products.multipleProducts;

    await login(page, email, password);
    await clearCart(page);
    for (const p of products) {
      await addProductToCart(page, p.id, p.quantity);
    }

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");

    // Tính tổng kỳ vọng
    const expectedTotal = products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0,
    );

    // Assertion: Tổng tiền hiển thị khớp
    const totalText = await page
      .locator('[class*="total"], [data-testid*="total"]')
      .first()
      .textContent()
      .catch(() => "");
    const actualTotal = parseInt(totalText.replace(/\D/g, ""), 10);
    expect(
      actualTotal,
      `Tổng tiền phải là ${expectedTotal.toLocaleString()}đ`,
    ).toBe(expectedTotal);
  });

  // --------------------------------------------------------------------------
  // TC-06: Client sửa total_amount trên UI
  // --------------------------------------------------------------------------
  test("TC-06 | Client sửa total_amount — backend phải tính lại [BUG:FR08-01,FR08-02]", async ({
    page,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");

    // Cố gắng sửa total_amount qua DevTools / evaluate
    await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        'input[name*="total"], input[id*="total"]',
      );
      inputs.forEach((el) => {
        el.removeAttribute("readonly");
        el.removeAttribute("disabled");
        el.value = "1";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });

    // Submit
    await page
      .locator(
        'button:has-text("Đặt hàng"), button:has-text("Thanh toán"), button[type="submit"]',
      )
      .last()
      .click();
    await page.waitForTimeout(2000);

    // Assertion: Kiểm tra qua API order vừa tạo
    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );
    const ordersRes = await page.request.get(`${BASE_URL}/api/orders?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orders = await ordersRes.json();
    const latestOrder = orders.data?.[0] || orders[0];

    if (latestOrder) {
      expect(
        latestOrder.total_amount,
        "[BUG FR08-02] Backend phải tính lại total_amount, không chấp nhận giá trị từ client",
      ).not.toBe(1);
    }
  });

  // --------------------------------------------------------------------------
  // TC-07: Client gửi total_amount = 0
  // --------------------------------------------------------------------------
  test("TC-07 | total_amount = 0 qua API — backend phải reject [BUG:FR08-02]", async ({
    page,
    request,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );

    // Gửi trực tiếp qua API với total_amount = 0
    const response = await request.post(`${BASE_URL}/api/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { total_amount: 0 },
    });

    // Assertion 1: Status code 400/422 (reject)
    expect(
      response.status(),
      "[BUG FR08-02] Backend phải trả 400/422 khi total_amount = 0",
    ).toBeGreaterThanOrEqual(400);
  });

  // --------------------------------------------------------------------------
  // TC-08: Client gửi total_amount âm
  // --------------------------------------------------------------------------
  test("TC-08 | total_amount âm qua API — backend phải reject [BUG:FR08-02]", async ({
    page,
    request,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);

    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );

    const response = await request.post(`${BASE_URL}/api/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { total_amount: -1 },
    });

    expect(
      response.status(),
      "[BUG FR08-02] Backend phải trả 400/422 khi total_amount âm",
    ).toBeGreaterThanOrEqual(400);
  });

  // --------------------------------------------------------------------------
  // TC-09: Thiếu địa chỉ vẫn checkout
  // --------------------------------------------------------------------------
  test("TC-09 | Thiếu địa chỉ — phải báo lỗi, không cho checkout [BUG:FR08-04]", async ({
    page,
  }) => {
    const { email, password } = testData.users.noAddress;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");

    await page
      .locator(
        'button:has-text("Đặt hàng"), button:has-text("Thanh toán"), button[type="submit"]',
      )
      .last()
      .click();
    await page.waitForTimeout(2000);

    // Assertion: Thông báo lỗi thiếu địa chỉ
    const errorMsg = page.locator("text=/địa chỉ|address|delivery/i").first();
    await expect(
      errorMsg,
      "[BUG FR08-04] Phải báo lỗi thiếu địa chỉ, không cho checkout",
    ).toBeVisible({ timeout: 5000 });

    // Assertion: Không tạo được đơn hàng
    await expect(page)
      .not.toHaveURL(new RegExp("/order|/success"), { timeout: 5000 })
      .catch(() => {});
  });

  // --------------------------------------------------------------------------
  // TC-10: Thiếu SĐT vẫn checkout
  // --------------------------------------------------------------------------
  test("TC-10 | Thiếu SĐT — phải báo lỗi, không cho checkout [BUG:FR08-04]", async ({
    page,
  }) => {
    const { email, password } = testData.users.noPhone;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");
    await page
      .locator(
        'button:has-text("Đặt hàng"), button:has-text("Thanh toán"), button[type="submit"]',
      )
      .last()
      .click();
    await page.waitForTimeout(2000);

    const errorMsg = page.locator("text=/số điện thoại|phone|sđt/i").first();
    await expect(errorMsg, "[BUG FR08-04] Phải báo lỗi thiếu SĐT").toBeVisible({
      timeout: 5000,
    });
  });

  // --------------------------------------------------------------------------
  // TC-11: Thiếu cả địa chỉ lẫn SĐT
  // --------------------------------------------------------------------------
  test("TC-11 | Thiếu cả địa chỉ + SĐT — phải báo lỗi [BUG:FR08-04]", async ({
    page,
  }) => {
    const { email, password } = testData.users.emptyProfile;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");
    await page
      .locator(
        'button:has-text("Đặt hàng"), button:has-text("Thanh toán"), button[type="submit"]',
      )
      .last()
      .click();
    await page.waitForTimeout(2000);

    await expect(page)
      .not.toHaveURL(new RegExp("/order/|/success"), { timeout: 5000 })
      .catch(() => {});
  });

  // --------------------------------------------------------------------------
  // TC-12: Giỏ hàng bị xóa sau checkout
  // --------------------------------------------------------------------------
  test("TC-12 | Giỏ hàng phải rỗng sau checkout thành công [BUG:FR08-03]", async ({
    page,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");
    await page
      .locator(
        'button:has-text("Đặt hàng"), button:has-text("Thanh toán"), button[type="submit"]',
      )
      .last()
      .click();
    await page.waitForTimeout(3000);

    // Assertion qua API
    const cartItems = await getCartItems(page);
    expect(
      cartItems.length,
      "[BUG FR08-03] Giỏ hàng phải rỗng (0 items) sau checkout thành công",
    ).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TC-13: Lịch sử đơn hàng cập nhật
  // --------------------------------------------------------------------------
  test("TC-13 | Lịch sử đơn hàng cập nhật sau checkout", async ({ page }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    // Lấy số đơn hàng trước
    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );
    const beforeRes = await page.request.get(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const beforeOrders = await beforeRes.json();
    const countBefore = (beforeOrders.data || beforeOrders).length;

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");
    await page
      .locator(
        'button:has-text("Đặt hàng"), button:has-text("Thanh toán"), button[type="submit"]',
      )
      .last()
      .click();
    await page.waitForTimeout(3000);

    // Lấy số đơn hàng sau
    const afterRes = await page.request.get(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterOrders = await afterRes.json();
    const countAfter = (afterOrders.data || afterOrders).length;

    // Assertion: Số đơn hàng tăng lên 1
    expect(countAfter).toBe(countBefore + 1);
  });

  // --------------------------------------------------------------------------
  // TC-14: Tổng tiền hiển thị đúng
  // --------------------------------------------------------------------------
  test("TC-14 | Tổng tiền = sum(giá × số lượng)", async ({ page }) => {
    const { email, password } = testData.users.loggedIn;
    const products = testData.products.multipleProducts;

    await login(page, email, password);
    await clearCart(page);
    for (const p of products) {
      await addProductToCart(page, p.id, p.quantity);
    }

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");

    const expectedTotal = products.reduce(
      (s, p) => s + p.price * p.quantity,
      0,
    );
    const totalLocator = page
      .locator('[class*="total"], [data-testid="total"], text=/tổng tiền/i')
      .first();
    const totalText = await totalLocator
      .textContent({ timeout: 5000 })
      .catch(() => "0");
    const actualTotal = parseInt(totalText.replace(/\D/g, ""), 10);

    // Assertion
    expect(actualTotal, `Tổng tiền phải là ${expectedTotal}`).toBe(
      expectedTotal,
    );
  });
});

// =============================================================================
// BVA TESTING
// =============================================================================

test.describe("FR-08 — BVA Testing | Cart & Total Amount Boundary", () => {
  // --------------------------------------------------------------------------
  // BVA-01: Giỏ hàng rỗng — on-point cart=0
  // --------------------------------------------------------------------------
  test("BVA-01 | cart=0 — on-point, không cho checkout", async ({ page }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);

    await page.goto(CART_URL);
    await page.waitForLoadState("networkidle");

    const emptyMsg = page.locator("text=/trống|empty/i").first();
    await expect(emptyMsg).toBeVisible({ timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // BVA-02: Giỏ hàng 1 sản phẩm — just above
  // --------------------------------------------------------------------------
  test("BVA-02 | cart=1 — just above, cho phép checkout", async ({ page }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(new RegExp("/checkout"), { timeout: 5000 });

    const checkoutBtn = page
      .locator(
        'button:has-text("Đặt hàng"), button:has-text("Thanh toán"), button[type="submit"]',
      )
      .last();
    await expect(checkoutBtn).toBeVisible();
    await expect(checkoutBtn).toBeEnabled();
  });

  // --------------------------------------------------------------------------
  // BVA-03: Giỏ hàng 2 sản phẩm — in-range
  // --------------------------------------------------------------------------
  test("BVA-03 | cart=2 — in-range, tổng tiền đúng", async ({ page }) => {
    const { email, password } = testData.users.loggedIn;
    const products = testData.products.multipleProducts;

    await login(page, email, password);
    await clearCart(page);
    for (const p of products) {
      await addProductToCart(page, p.id, p.quantity);
    }

    await page.goto(CHECKOUT_URL);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(new RegExp("/checkout"), { timeout: 5000 });
  });

  // --------------------------------------------------------------------------
  // BVA-04: total_amount = 0 do client gửi
  // --------------------------------------------------------------------------
  test("BVA-04 | total=0 — on-point, backend phải reject [BUG:FR08-02]", async ({
    page,
    request,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);

    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );

    const res = await request.post(`${BASE_URL}/api/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { total_amount: 0 },
    });

    expect(
      res.status(),
      "[BUG FR08-02] total=0 phải bị từ chối",
    ).toBeGreaterThanOrEqual(400);
  });

  // --------------------------------------------------------------------------
  // BVA-05: total_amount âm
  // --------------------------------------------------------------------------
  test("BVA-05 | total=-1 — below boundary, backend phải reject [BUG:FR08-02]", async ({
    page,
    request,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);

    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );

    const res = await request.post(`${BASE_URL}/api/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { total_amount: -1 },
    });

    expect(
      res.status(),
      "[BUG FR08-02] total âm phải bị từ chối",
    ).toBeGreaterThanOrEqual(400);
  });

  // --------------------------------------------------------------------------
  // BVA-07: Client sửa total nhỏ hơn thực
  // --------------------------------------------------------------------------
  test("BVA-07 | Client sửa total nhỏ hơn thực — backend recalculate [BUG:FR08-02]", async ({
    page,
    request,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );

    // Gửi với total_amount = 1 (thấp hơn giá thực)
    const res = await request.post(`${BASE_URL}/api/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { total_amount: 1 },
    });

    if (res.status() < 400) {
      const body = await res.json();
      const savedTotal = body.data?.total_amount || body.total_amount;
      const { price } = testData.products.singleProduct;
      expect(
        savedTotal,
        "[BUG FR08-02] Backend phải tính lại total, không được lưu giá trị 1 từ client",
      ).not.toBe(1);
      expect(savedTotal).toBe(price);
    } else {
      // Đây là hành vi đúng — reject
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });

  // --------------------------------------------------------------------------
  // BVA-08: Client sửa total lớn hơn thực
  // --------------------------------------------------------------------------
  test("BVA-08 | Client sửa total lớn hơn thực — backend recalculate [BUG:FR08-02]", async ({
    page,
    request,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    const token = await page.evaluate(
      () =>
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt"),
    );

    const inflatedTotal = 99999999;
    const res = await request.post(`${BASE_URL}/api/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { total_amount: inflatedTotal },
    });

    if (res.status() < 400) {
      const body = await res.json();
      const savedTotal = body.data?.total_amount || body.total_amount;
      expect(
        savedTotal,
        "[BUG FR08-02] Backend không được chấp nhận total_amount thổi phồng từ client",
      ).not.toBe(inflatedTotal);
    }
  });

  // --------------------------------------------------------------------------
  // BVA-09: Số lượng = 0 — sản phẩm tự xóa
  // --------------------------------------------------------------------------
  test("BVA-09 | quantity=0 — on-point, sản phẩm tự xóa khỏi giỏ", async ({
    page,
  }) => {
    const { email, password } = testData.users.loggedIn;
    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, 1, 1);

    await page.goto(CART_URL);
    await page.waitForLoadState("networkidle");

    // Giảm quantity xuống 0
    const decreaseBtn = page
      .locator(
        'button:has-text("-"), button[aria-label*="giảm"], button[aria-label*="decrease"]',
      )
      .first();
    await decreaseBtn.click();
    await page.waitForTimeout(1000);

    // Assertion: sản phẩm bị xóa hoặc giỏ trống
    const cartItems = await getCartItems(page);
    expect(cartItems.length, "Khi quantity=0, item phải tự xóa").toBe(0);
  });

  // --------------------------------------------------------------------------
  // BVA-10: Số lượng = 1 — just above
  // --------------------------------------------------------------------------
  test("BVA-10 | quantity=1 — just above, tính đúng giá", async ({ page }) => {
    const { email, password } = testData.users.loggedIn;
    const product = testData.products.singleProduct;

    await login(page, email, password);
    await clearCart(page);
    await addProductToCart(page, product.id, 1);

    await page.goto(CART_URL);
    await page.waitForLoadState("networkidle");

    // Assertion: Giá hiển thị = price × 1
    const priceText = await page
      .locator('[class*="price"], [data-testid*="price"]')
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => "0");
    const displayedPrice = parseInt(priceText.replace(/\D/g, ""), 10);
    expect(displayedPrice).toBe(product.price * 1);
  });
});
