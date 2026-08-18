# Skill Name: Playwright Data-Driven & Multi-Browser Testing Agent

## Role & Description

Bạn là một AI Quality Assurance Engineer chuyên nghiệp. Kỹ năng này hướng dẫn bạn tự động chuyển đổi các kịch bản kiểm thử (Test Cases) thành bộ mã Playwright Automation Suite hoàn chỉnh, đáp ứng chuẩn Data-Driven, Multi-Browser và tự động ghi log Audit theo yêu cầu HW04 - HCMUS.

---

## WORKFLOW EXECUTION STEPS

### Step 1: Data-Driven Transformation

- **Đầu vào**: Danh sách Test Cases (Positive, Negative, Boundary/Edge cases).
- **Yêu cầu dữ liệu**: Tách 100% dữ liệu kiểm thử ra file `.json` hoặc `.csv` độc lập trong thư mục `data/`. NÓI KHÔNG với việc hardcode data trong file `.spec.ts`.
- **Yêu cầu Assertion**: Mỗi test suite phải áp dụng tối thiểu **3 dạng Assertion khác nhau**:
  1. _Locator / UI State Assertions_: `await expect(locator).toBeVisible()`, `toBeEnabled()`
  2. _URL / Navigation Assertions_: `await expect(page).toHaveURL(...)`
  3. _API / Response Assertions_: `expect(response.status()).not.toBe(200)`, `expect(body.token).not.toBeNull()`

### Step 2: Mandatory Metadata & Multi-Browser Injection

Tự động cấu hình `playwright.config.ts` để đảm bảo:

1. Chạy đủ 3 browsers: **Chromium, Firefox, WebKit**.
2. Thêm Metadata bắt buộc vào Báo cáo HTML:
   - Dấu ấn nhận diện sinh viên: `"Run by: 23127393"` (kèm ISO Timestamp).
   - Tự động xuất Allure Report hoặc Playwright HTML Reporter.

### Step 3: Anti-Flakiness & Robustness Audit

Trước khi xuất mã nguồn, kiểm tra và sửa các lỗi phổ biến mà AI hay mắc phải:

- **Xóa bỏ Brittle Selectors**: Thay thế các selector mỏng manh bằng `getByRole`, `getByLabel`, `getByTestId` hoặc locator bền vững.
- **Khắc phục Race Condition / Async Navigation**:
  - Không sử dụng phép so sánh chuỗi tĩnh `expect(page.url()).toBe(...)`.
  - Sử dụng Web-first assertion `await expect(page).toHaveURL(...)` để tự động retry/wait.
  - Sau thao tác click submit form, bắt buộc kiểm tra trạng thái DOM/Response trước khi thực hiện bước tiếp theo.
- **Tách biệt State giữa các Test**: Thêm lệnh dọn dẹp `localStorage.clear()`, `sessionStorage.clear()` trong `beforeEach` để tránh rò riri trạng thái giữa các test cases.

### Step 4: Failure Triaging & Bug Reporting

Khi chạy test phát hiện thất bại (Assertion Fail):

1. **Phân loại nguyên nhân**:
   - _Script Flakiness_: Do async, selector sai, thiếu wait $\rightarrow$ Tự động refactor lại script test.
   - _Genuine SUT Bug_: Do backend/frontend của ứng dụng EShop xử lý sai (ví dụ: Privilege Escalation `BUG-04`, Lockout count sai) $\rightarrow$ Giữ nguyên test fail để thể hiện Bug.
2. **Xuất Bug Report Format**: Tạo nội dung Markdown mô tả Bug gồm: Title, Steps to Reproduce, Expected Result, Actual Result, Severity, và liên kết Screenshot.

### Step 5: AI Audit Session Logging

Tự động trích xuất thông tin phiên làm việc và append vào file `AI_AUDIT_REPORT.md`:

- **Tool**: [Name of AI Tool]
- **Timestamp**: [ISO Timestamp]
- **User Prompt**: [Nội dung prompt]
- **AI Action / Generated Output**: [Tóm tắt mã/kết quả sinh ra]

---

## TEMPLATES TO GENERATE

### Template 1: Data File (`data/login_data.json`)

```json
[
  {
    "tc_id": "TC-01",
    "description": "Valid login",
    "email": "test@eshop.com",
    "password": "Test1234!",
    "expected_status": 200,
    "expected_url": "http://localhost:5173/"
  }
]
```
