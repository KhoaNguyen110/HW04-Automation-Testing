import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const LOGIN_URL = `${BASE_URL}/login`;
const CHECKOUT_URL = `${BASE_URL}/checkout`;
const CART_URL = `${BASE_URL}/cart`;
const PROFILE_URL = `${BASE_URL}/profile`;

// ─── HÀM HỖ TRỢ (HELPER FUNCTIONS) ───

async function login(page) {
  await page.goto(LOGIN_URL);
  await page.getByRole("textbox").first().fill("test@eshop.com");
  await page.getByRole("textbox").nth(1).fill("Test1234!");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(`${BASE_URL}/`);
}

// Xóa sạch giỏ hàng trước mỗi test case để đảm bảo tính cô lập (Isolation)
async function clearCart(page) {
  await page.goto(CART_URL);
  const deleteButtons = page.getByRole("button", { name: "Xóa" });
  while ((await deleteButtons.count()) > 0) {
    await deleteButtons.first().click();
    await page.waitForTimeout(300);
  }
}

// Thêm 1 sản phẩm từ trang chủ (Click 1 lần)
async function addSingleItemFromHome(page) {
  await page.goto(`${BASE_URL}/`);
  await page.getByRole("button", { name: "Thêm vào giỏ" }).first().click();
}

// Thêm sản phẩm từ trang chi tiết với số lượng (BẮT BỘC dblclick theo UI SUT)
async function addItemsFromDetail(page, quantity) {
  await page.goto(`${BASE_URL}/`);
  await page.getByRole("link", { name: "Xem chi tiết" }).first().click();

  const qtyInput = page.getByRole("spinbutton");
  await qtyInput.click();
  await qtyInput.fill(quantity.toString());

  // Bug UI/UX: Phải click 2 lần nút "Thêm vào giỏ hàng"
  await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).dblclick();
}

// Cập nhật profile (Địa chỉ & SĐT)
async function updateProfileInfo(
  page,
  { phone = "0901234567", address = "123 Nguyen Van Cuye" } = {},
) {
  await page.goto(PROFILE_URL);

  const phoneInput = page.getByRole("textbox", { name: "VD:" });
  const addressInput = page.getByRole("textbox", {
    name: "Nhập địa chỉ của bạn",
  });

  if (await phoneInput.isVisible()) {
    await phoneInput.fill(phone);
  }
  if (await addressInput.isVisible()) {
    await addressInput.fill(address);
  }

  await page.getByRole("button", { name: "Cập nhật" }).click();
}

async function proceedToCheckout(page) {
  await page.goto(CART_URL);
  await page.getByRole("button", { name: "Tiến hành thanh toán" }).click();
}

// ─── PHẦN 1: AUTH & EMPTY STATE ───

test.describe("FR-08: Checkout — Authentication & Giỏ hàng trống", () => {
  test("TC-02: Chưa đăng nhập vào trang checkout — Redirect về /login", async ({
    page,
  }) => {
    await page.goto(CHECKOUT_URL);
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("TC-03 / BVA-01: Giỏ hàng rỗng (0 items) — Báo giỏ trống, không cho checkout", async ({
    page,
  }) => {
    await login(page);
    await clearCart(page);

    await expect(
      page.getByRole("heading", { name: "Giỏ hàng của bạn đang trống" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tiến hành thanh toán" }),
    ).toBeHidden();
  });
});

// ─── PHẦN 2: ITEM QUANTITIES & CART DISPLAY ───

test.describe("FR-08: Checkout — Số lượng & Hiển thị giỏ hàng", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearCart(page);
  });

  test("TC-04 / BVA-02: Giỏ hàng 1 sản phẩm — Hiển thị đúng 1 sản phẩm", async ({
    page,
  }) => {
    await addSingleItemFromHome(page);
    await page.goto(CART_URL);

    const rowCount = await page.getByRole("row").count();
    expect(rowCount).toBe(2); // 1 header row + 1 item row
    await expect(
      page.getByRole("cell", { name: "1", exact: true }),
    ).toBeVisible();
  });

  test("BVA-03: Giỏ hàng 2 sản phẩm — Cho checkout, hiển thị đủ 2 sản phẩm", async ({
    page,
  }) => {
    await addSingleItemFromHome(page);
    await addItemsFromDetail(page, 1);
    await page.goto(CART_URL);

    await expect(
      page.getByRole("button", { name: "Tiến hành thanh toán" }),
    ).toBeEnabled();
  });

  test("TC-05 / TC-14: Giỏ hàng nhiều sản phẩm — Tổng tiền = sum(giá × số lượng)", async ({
    page,
  }) => {
    await addItemsFromDetail(page, 2);
    await page.goto(CART_URL);

    // Giả định đơn giá 30,000,000 -> 2 cái = 60,000,000
    await expect(page.getByText("Tổng tạm tính: 60,000,000 ₫")).toBeVisible();
  });

  test("BVA-09: Số lượng sản phẩm = 0 trong giỏ — Không cho thêm hoặc tự xóa", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/`);
    await page.getByRole("link", { name: "Xem chi tiết" }).first().click();

    const qtyInput = page.getByRole("spinbutton");
    await qtyInput.fill("0");
    await page.getByRole("button", { name: "Thêm vào giỏ hàng" }).dblclick();

    await page.goto(CART_URL);
    await expect(
      page.getByRole("heading", { name: "Giỏ hàng của bạn đang trống" }),
    ).toBeVisible();
  });

  test("BVA-10: Số lượng sản phẩm = 1 — Tính đúng giá × 1", async ({
    page,
  }) => {
    await addItemsFromDetail(page, 1);
    await page.goto(CART_URL);

    await expect(
      page.getByRole("cell", { name: "1", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Tổng tạm tính: 30,000,000 ₫")).toBeVisible();
  });

  test("BVA-11: Số lượng sản phẩm lớn (stress 12,345 items) — Tính đúng tổng, không overflow", async ({
    page,
  }) => {
    await addItemsFromDetail(page, 12345);
    await page.goto(CART_URL);

    await expect(
      page.getByRole("cell", { name: "370,350,000,000 ₫" }),
    ).toBeVisible();
  });
});

// ─── PHẦN 3: CHECKOUT SUCCESS FLOW & POST-CONDITIONS ───

test.describe("FR-08: Checkout — Quy trình thanh toán thành công & Cập nhật dữ liệu", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await updateProfileInfo(page, {
      phone: "0901234567",
      address: "123 Nguyen Van Cuye",
    });
    await clearCart(page);
  });

  test("TC-01: Checkout thành công đầy đủ thông tin — Báo thành công", async ({
    page,
  }) => {
    await addSingleItemFromHome(page);
    await proceedToCheckout(page);

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    // Expectation Fail ở HW02 (Cần ghi nhận đúng trạng thái UI thực tế)
    await expect
      .soft(page.getByRole("heading", { name: "Thanh toán thành công!" }))
      .toBeVisible();
  });

  test("TC-12: Sau checkout thành công — Giỏ hàng phải rỗng", async ({
    page,
  }) => {
    await addSingleItemFromHome(page);
    await proceedToCheckout(page);
    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    await page.goto(CART_URL);
    // Backend chưa xóa giỏ hàng -> FAIL ở HW02
    await expect
      .soft(page.getByRole("heading", { name: "Giỏ hàng của bạn đang trống" }))
      .toBeVisible();
  });

  test("TC-13: Sau checkout thành công — Đơn hàng xuất hiện trong Lịch sử đơn hàng", async ({
    page,
  }) => {
    await addSingleItemFromHome(page);
    await proceedToCheckout(page);
    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    await page.goto(`${BASE_URL}/orders`); // Giả định đường dẫn lịch sử đơn hàng
    await expect(page.getByText("30,000,000 ₫")).toBeVisible();
  });

  test("BVA-06: total_amount = 1đ hợp lệ — Chấp nhận nếu sản phẩm giá 1đ", async ({
    page,
  }) => {
    // Mua sản phẩm có giá 1đ
    await addSingleItemFromHome(page);
    await proceedToCheckout(page);

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();
    await expect
      .soft(page.getByRole("heading", { name: "Thanh toán thành công!" }))
      .toBeVisible();
  });
});

// ─── PHẦN 4: SECURITY & CLIENT-SIDE MANIPULATION ───

test.describe("FR-08: Checkout — Security & Client-side Total Manipulation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await updateProfileInfo(page);
    await clearCart(page);
    await addSingleItemFromHome(page);
    await proceedToCheckout(page);
  });

  test("TC-06 / BVA-07: Client tự sửa total_amount nhỏ hơn thực tế — Backend phải tính lại đúng", async ({
    page,
  }) => {
    const totalInput = page.getByRole("spinbutton");
    await totalInput.fill("12222220"); // Giá gốc 30M, sửa thành 12M
    await totalInput.press("Enter");

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    // Backend chuẩn phải từ chối thanh toán với số tiền sai lệch
    expect.soft(page.url()).not.toContain("success");
    await expect
      .soft(page.getByRole("heading", { name: "Thanh toán thành công!" }))
      .toBeHidden();
  });

  test("TC-07 / BVA-04: Client sửa total_amount = 0 — Backend không được chấp nhận", async ({
    page,
  }) => {
    const totalInput = page.getByRole("spinbutton");
    await totalInput.fill("0");
    await totalInput.press("Enter");

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    expect.soft(page.url()).not.toContain("success");
    await expect
      .soft(page.getByRole("heading", { name: "Thanh toán thành công!" }))
      .toBeHidden();
  });

  test("TC-08 / BVA-05: Client sửa total_amount âm (-1) — Backend không được chấp nhận", async ({
    page,
  }) => {
    const totalInput = page.getByRole("spinbutton");
    await totalInput.fill("-1");
    await totalInput.press("Enter");

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    expect.soft(page.url()).not.toContain("success");
    await expect
      .soft(page.getByRole("heading", { name: "Thanh toán thành công!" }))
      .toBeHidden();
  });

  test("BVA-08: Client sửa total_amount lớn hơn thực tế — Backend phải tính lại đúng", async ({
    page,
  }) => {
    const totalInput = page.getByRole("spinbutton");
    await totalInput.fill("999999999");
    await totalInput.press("Enter");

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    expect.soft(page.url()).not.toContain("success");
  });
});

// ─── PHẦN 5: PROFILE VALIDATION CHECKOUT ───

test.describe("FR-08: Checkout — Validation Profile (Địa chỉ & SĐT)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await clearCart(page);
    await addSingleItemFromHome(page);
  });

  test("TC-09: Thiếu địa chỉ giao hàng — Báo lỗi thiếu địa chỉ khi checkout", async ({
    page,
  }) => {
    await updateProfileInfo(page, { phone: "0901234567", address: "" });
    await proceedToCheckout(page);

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    // Backend cho qua -> Fail ở HW02
    await expect
      .soft(page.getByText(/vui lòng nhập địa chỉ|thiếu địa chỉ/i))
      .toBeVisible();
  });

  test("TC-10: Thiếu Số điện thoại — Báo lỗi thiếu SĐT khi checkout", async ({
    page,
  }) => {
    await updateProfileInfo(page, {
      phone: "",
      address: "123 Nguyen Van Cuye",
    });
    await proceedToCheckout(page);

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    await expect
      .soft(page.getByText(/vui lòng nhập số điện thoại|thiếu sđt/i))
      .toBeVisible();
  });

  test("TC-11: Thiếu cả địa chỉ lẫn SĐT — Báo lỗi thiếu thông tin", async ({
    page,
  }) => {
    await updateProfileInfo(page, { phone: "", address: "" });
    await proceedToCheckout(page);

    await page.getByRole("button", { name: "Xác Nhận Thanh Toán" }).click();

    await expect
      .soft(page.getByText(/thiếu thông tin|vui lòng cập nhật profile/i))
      .toBeVisible();
  });
});
