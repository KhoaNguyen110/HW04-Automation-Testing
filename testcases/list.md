# Danh sách Test Cases — HW04 Automation Testing

**Sinh viên:** Nguyễn Đăng Khoa | **MSSV:** 23127393  
**Nguồn:** Trích xuất từ HW02 — Domain Testing & BVA Report

---

## Feature A — FR-02: Login and Account Lockout

**URL:** `http://localhost:5173/login`  
**Tổng:** 35 TC (19 Domain + 16 BVA)

### Domain Testing

| TC ID | Mô tả                                       | Email                   | Password         | Attempts    | Kết quả mong đợi                               | Pass/Fail HW02 |
| ----- | ------------------------------------------- | ----------------------- | ---------------- | ----------- | ---------------------------------------------- | -------------- |
| TC-01 | Đăng nhập thành công                        | D1 valid email          | P1 correct pass  | A1 (0)      | Redirect về `/`, nhận JWT Token                | Pass           |
| TC-02 | Email rỗng                                  | D6 empty                | P1 correct pass  | A1 (0)      | Báo bắt buộc nhập email                        | Pass           |
| TC-03 | Password rỗng                               | D1 valid email          | P3 empty         | A1 (0)      | Báo bắt buộc nhập password                     | Pass           |
| TC-04 | Cả 2 field rỗng                             | D6 empty                | P3 empty         | A1 (0)      | Báo bắt buộc nhập                              | Pass           |
| TC-05 | Email sai format (không có @)               | D2 `userexample.com`    | P1 correct pass  | A1 (0)      | HTML5 validation báo sai format                | **Fail**       |
| TC-06 | Email sai format (thiếu domain)             | D3 `user@`              | P1 correct pass  | A1 (0)      | HTML5 validation báo sai format                | **Fail**       |
| TC-07 | Email chỉ có @                              | D4 `@gmail.com`         | P1 correct pass  | A1 (0)      | HTML5 validation báo sai format                | **Fail**       |
| TC-08 | Email không tồn tại                         | D5 `notexist@gmail.com` | P2 wrong pass    | A1 (0)      | Báo đăng nhập thất bại                         | Pass           |
| TC-09 | Sai password lần 1                          | D1 valid email          | P2 wrong pass    | A2 (1)      | Báo thất bại, cho thử lại                      | Pass           |
| TC-10 | Sai password lần 2                          | D1 valid email          | P2 wrong pass    | A3 (2)      | Báo thất bại, cho thử lại                      | **Fail**       |
| TC-11 | Sai password lần 3 — trigger lockout        | D1 valid email          | P2 wrong pass    | A4 (3)      | Tài khoản bị khóa 30 giây, hiển thị thông báo  | **Fail**       |
| TC-12 | Login đúng pass khi đang lockout            | D1 valid email          | P1 correct pass  | A4 (locked) | Vẫn không vào được, hiển thị thông báo bị khóa | **Fail**       |
| TC-13 | Login sai tiếp khi đang lockout             | D1 valid email          | P2 wrong pass    | A5 (4+)     | Vẫn bị khóa                                    | Pass           |
| TC-14 | Login đúng sau khi hết lockout (>30s)       | D1 valid email          | P1 correct pass  | A6          | Đăng nhập thành công, redirect về `/`          | **Fail**       |
| TC-15 | Password có khoảng trắng đầu/cuối           | D1 valid email          | P4 ` pass`       | A1 (0)      | Xác định hệ thống có trim không                | **Fail**       |
| TC-16 | Email chữ HOA                               | D8 `USER@GMAIL.COM`     | P1 correct pass  | A1 (0)      | Đăng nhập thành công (case-insensitive)        | **Fail**       |
| TC-17 | Password đúng nhưng khác hoa/thường         | D1 valid email          | P5 `CORRECTPASS` | A1 (0)      | Đăng nhập thất bại (case-sensitive)            | Pass           |
| TC-18 | Reset attempts sau login thành công         | D1 valid email          | P1 correct pass  | A3          | Thành công, bộ đếm về 0                        | Pass           |
| TC-19 | Gửi request cập nhật profile với role=admin | D1 valid email          | P1 correct pass  | —           | Backend bỏ qua trường role                     | **Fail**       |

### BVA Testing

| TC ID  | Mô tả                                     | Input                            | Biên liên quan                   | Kết quả mong đợi                              | Pass/Fail HW02 |
| ------ | ----------------------------------------- | -------------------------------- | -------------------------------- | --------------------------------------------- | -------------- |
| BVA-01 | Không có lần sai nào, login đúng          | email đúng, pass đúng, 0 lần sai | Below lower bound (attempts=0)   | Đăng nhập thành công                          | Pass           |
| BVA-02 | Sai 1 lần                                 | email đúng, pass sai × 1         | In-range (attempts=1)            | Báo lỗi, cho thử lại                          | Pass           |
| BVA-03 | Sai 2 lần — dưới biên lockout             | email đúng, pass sai × 2         | Just below boundary (attempts=2) | Báo lỗi, vẫn cho thử lại                      | **Fail**       |
| BVA-04 | Sai đúng 3 lần — kích hoạt lockout        | email đúng, pass sai × 3         | On-point (attempts=3)            | Tài khoản bị khóa 30 giây, hiển thị thông báo | **Fail**       |
| BVA-05 | Sai 4 lần — vượt biên                     | email đúng, pass sai × 4         | Just above boundary (attempts=4) | Vẫn bị khóa                                   | Pass           |
| BVA-06 | Login đúng sau 29 giây (vẫn còn locked)   | email đúng, pass đúng, sau 29s   | Just below time boundary (29s)   | Vẫn bị khóa                                   | Pass           |
| BVA-07 | Login đúng sau đúng 30 giây               | email đúng, pass đúng, sau 30s   | On-point time boundary (30s)     | Đăng nhập thành công                          | **Fail**       |
| BVA-08 | Login đúng sau 31 giây                    | email đúng, pass đúng, sau 31s   | Just above time boundary (31s)   | Đăng nhập thành công                          | **Fail**       |
| BVA-09 | Email rỗng                                | email="", pass đúng              | On-point empty email             | Báo bắt buộc nhập email                       | Pass           |
| BVA-10 | Email format tối thiểu hợp lệ             | email=`a@b.c`, pass đúng         | On-point minimum valid email     | Cho submit, server báo sai thông tin          | Pass           |
| BVA-11 | Email thiếu @                             | email=`usergmail.com`            | Invalid email boundary           | HTML5 báo sai format                          | **Fail**       |
| BVA-12 | Email thiếu local part                    | email=`@gmail.com`               | Invalid email boundary           | HTML5 báo sai format                          | **Fail**       |
| BVA-13 | Email thiếu domain                        | email=`user@`                    | Invalid email boundary           | HTML5 báo sai format                          | **Fail**       |
| BVA-14 | Password rỗng                             | email đúng, pass=""              | On-point empty password          | Báo bắt buộc nhập password                    | Pass           |
| BVA-15 | Password 1 ký tự                          | email đúng, pass=`a`             | Just above empty                 | Cho submit, server báo sai                    | Pass           |
| BVA-16 | Login đúng sau lockout, bộ đếm reset về 0 | email đúng, pass đúng, sau 30s   | Post-lockout reset               | Thành công, bộ đếm về 0                       | Pass           |

### Bug phát hiện (FR-02)

| Bug ID  | Severity | Mô tả                                                         |
| ------- | -------- | ------------------------------------------------------------- |
| FR02-01 | Minor    | Tiêu đề trang login hiển thị sai                              |
| FR02-02 | Major    | Tài khoản bị lockout nhưng không hiển thị thông báo/countdown |
| FR02-03 | Major    | Mật khẩu không được ẩn khi nhập                               |
| FR02-04 | Major    | Lockout kích hoạt sớm ở lần sai thứ 2 (thay vì 3)             |
| FR02-05 | Major    | Lockout thực tế ~3 phút thay vì 30 giây                       |
| FR02-06 | Major    | Email sai format không bị chặn ở client                       |
| FR02-07 | Major    | Email viết hoa toàn bộ không đăng nhập được                   |
| FR02-08 | Critical | User thường có thể tự nâng role thành admin qua API           |

---

## Feature B — FR-08: Checkout

**URL:** `http://localhost:5173/checkout`  
**Tổng:** 25 TC (14 Domain + 11 BVA)

### Domain Testing

| TC ID | Mô tả                                    | auth             | cart              | total_amount    | profile          | Kết quả mong đợi                          | Pass/Fail HW02 |
| ----- | ---------------------------------------- | ---------------- | ----------------- | --------------- | ---------------- | ----------------------------------------- | -------------- |
| TC-01 | Checkout thành công đầy đủ thông tin     | A1 logged in     | C1 có hàng        | T1 backend tính | U1 đầy đủ        | Thanh toán thành công, giỏ hàng xóa       | **Fail**       |
| TC-02 | Chưa đăng nhập vào trang checkout        | A2 not logged in | C1 có hàng        | —               | —                | Redirect về `/login`                      | Pass           |
| TC-03 | Giỏ hàng rỗng                            | A1 logged in     | C2 rỗng           | —               | U1 đầy đủ        | Báo giỏ hàng trống                        | Pass           |
| TC-04 | Giỏ hàng 1 sản phẩm                      | A1 logged in     | C3 1 sản phẩm     | T1 backend tính | U1 đầy đủ        | Hiển thị đúng 1 sản phẩm                  | Pass           |
| TC-05 | Giỏ hàng nhiều sản phẩm                  | A1 logged in     | C4 nhiều sản phẩm | T1 backend tính | U1 đầy đủ        | Hiển thị đầy đủ, tổng tiền đúng           | Pass           |
| TC-06 | Client tự sửa total_amount trên UI       | A1 logged in     | C1 có hàng        | T2 client sửa   | U1 đầy đủ        | Backend tính lại đúng                     | **Fail**       |
| TC-07 | Client gửi total_amount = 0              | A1 logged in     | C1 có hàng        | T3 = 0          | U1 đầy đủ        | Backend tính lại đúng, không chấp nhận 0  | **Fail**       |
| TC-08 | Client gửi total_amount âm               | A1 logged in     | C1 có hàng        | T4 âm           | U1 đầy đủ        | Backend tính lại đúng, không chấp nhận âm | **Fail**       |
| TC-09 | Thiếu địa chỉ vẫn checkout               | A1 logged in     | C1 có hàng        | T1 backend tính | U2 thiếu địa chỉ | Báo lỗi thiếu địa chỉ                     | **Fail**       |
| TC-10 | Thiếu SĐT vẫn checkout                   | A1 logged in     | C1 có hàng        | T1 backend tính | U3 thiếu SĐT     | Báo lỗi thiếu SĐT                         | **Fail**       |
| TC-11 | Thiếu cả địa chỉ lẫn SĐT                 | A1 logged in     | C1 có hàng        | T1 backend tính | U4 thiếu hết     | Báo lỗi thiếu thông tin                   | **Fail**       |
| TC-12 | Sau checkout thành công giỏ hàng xóa     | A1 logged in     | C1 có hàng        | T1 backend tính | U1 đầy đủ        | Giỏ hàng rỗng sau khi thanh toán          | **Fail**       |
| TC-13 | Sau checkout thành công lịch sử cập nhật | A1 logged in     | C1 có hàng        | T1 backend tính | U1 đầy đủ        | Đơn hàng xuất hiện trong lịch sử          | Pass           |
| TC-14 | Tổng tiền hiển thị đúng với giỏ hàng     | A1 logged in     | C4 nhiều sản phẩm | T1 backend tính | U1 đầy đủ        | Tổng tiền = sum(giá × số lượng)           | Pass           |

### BVA Testing

| TC ID  | Mô tả                                  | Input               | Biên liên quan           | Kết quả mong đợi                       | Pass/Fail HW02     |
| ------ | -------------------------------------- | ------------------- | ------------------------ | -------------------------------------- | ------------------ |
| BVA-01 | Giỏ hàng rỗng (0 sản phẩm)             | cart = 0 items      | On-point cart=0          | Không cho checkout, báo giỏ trống      | Pass               |
| BVA-02 | Giỏ hàng 1 sản phẩm — tối thiểu hợp lệ | cart = 1 item       | Just above (cart=1)      | Cho checkout, hiển thị đúng 1 sản phẩm | Pass               |
| BVA-03 | Giỏ hàng 2 sản phẩm                    | cart = 2 items      | In-range (cart=2)        | Cho checkout, tổng tiền đúng           | Pass               |
| BVA-04 | total_amount = 0 do client gửi         | client gửi total=0  | On-point total=0         | Backend từ chối hoặc tính lại          | **Fail**           |
| BVA-05 | total_amount âm do client gửi          | client gửi total=-1 | Below boundary total<0   | Backend từ chối hoặc tính lại          | **Fail**           |
| BVA-06 | total_amount = 1đ hợp lệ               | sản phẩm giá 1đ     | Just above total=1       | Backend chấp nhận nếu khớp giỏ hàng    | **Fail**           |
| BVA-07 | Client sửa total_amount nhỏ hơn thực   | DevTools: sửa total | Client-side manipulation | Backend tính lại đúng                  | **Fail**           |
| BVA-08 | Client sửa total_amount lớn hơn thực   | DevTools: sửa total | Client-side manipulation | Backend tính lại đúng                  | **Fail**           |
| BVA-09 | Số lượng sản phẩm = 0 trong giỏ        | quantity = 0        | On-point quantity=0      | Không cho thêm hoặc tự xóa             | Pass               |
| BVA-10 | Số lượng sản phẩm = 1                  | quantity = 1        | Just above quantity=1    | Tính đúng giá × 1                      | Pass               |
| BVA-11 | Số lượng sản phẩm lớn (stress)         | quantity = 999      | Far above boundary       | Tính đúng tổng, không overflow         | NA (chưa thực thi) |

### Bug phát hiện (FR-08)

| Bug ID  | Severity | Mô tả                                                   |
| ------- | -------- | ------------------------------------------------------- |
| FR08-01 | Critical | Tổng tiền checkout cho phép chỉnh sửa trực tiếp trên UI |
| FR08-02 | Critical | Backend chấp nhận total_amount do client sửa            |
| FR08-03 | Major    | Checkout thành công nhưng giỏ hàng không bị xóa         |
| FR08-04 | Major    | Vẫn cho checkout khi thiếu địa chỉ/SĐT nhận hàng        |

---

## Feature C — FR-14: Category Management (CRUD)

**URL:** `http://localhost:5173/admin/categories`  
**Tổng:** 27 TC (17 Domain + 10 BVA)

### Domain Testing

| TC ID | Mô tả                                 | auth_role        | category_name                  | category_id    | Kết quả mong đợi                  | Pass/Fail HW02 |
| ----- | ------------------------------------- | ---------------- | ------------------------------ | -------------- | --------------------------------- | -------------- |
| TC-01 | Admin xem danh sách danh mục          | R1 admin         | —                              | —              | Hiển thị đầy đủ danh sách         | Pass           |
| TC-02 | User thường truy cập trang admin      | R2 user          | —                              | —              | Bị từ chối, báo 403 hoặc redirect | Pass           |
| TC-03 | Chưa đăng nhập truy cập trang admin   | R3 not logged in | —                              | —              | Redirect về `/login`              | Pass           |
| TC-04 | Thêm danh mục hợp lệ                  | R1 admin         | N1 `"Điện thoại"`              | —              | Thêm thành công                   | Pass           |
| TC-05 | Thêm danh mục có khoảng trắng giữa    | R1 admin         | N2 `"Đồ gia dụng"`             | —              | Thêm thành công                   | Pass           |
| TC-06 | Thêm danh mục tên rỗng                | R1 admin         | N3 `""`                        | —              | Báo lỗi bắt buộc nhập             | **Fail**       |
| TC-07 | Thêm danh mục chỉ có khoảng trắng     | R1 admin         | N4 `" "`                       | —              | Báo lỗi bắt buộc nhập             | **Fail**       |
| TC-08 | Thêm danh mục tên rất dài             | R1 admin         | N5 255+ ký tự                  | —              | Báo lỗi hoặc cắt bớt              | **Fail**       |
| TC-09 | Thêm danh mục trùng tên               | R1 admin         | N6 tên trùng                   | —              | Báo lỗi tên đã tồn tại            | **Fail**       |
| TC-10 | Thêm danh mục tên có script injection | R1 admin         | N7 `<script>alert(1)</script>` | —              | Sanitize hoặc báo lỗi             | Pass           |
| TC-11 | Thêm danh mục tên chỉ có số           | R1 admin         | N8 `"12345"`                   | —              | Thêm thành công                   | Pass           |
| TC-12 | Xóa danh mục tồn tại                  | R1 admin         | —                              | I1 valid ID    | Xóa thành công                    | Pass           |
| TC-13 | Xóa danh mục đang có sản phẩm         | R1 admin         | —                              | I3 có sản phẩm | Cảnh báo / chặn xóa               | **Fail**       |
| TC-14 | Xem danh sách sau khi thêm            | R1 admin         | N1 mới thêm                    | —              | Danh mục mới xuất hiện            | Pass           |
| TC-15 | Xem danh sách sau khi xóa             | R1 admin         | —                              | I1 vừa xóa     | Danh mục đã xóa biến mất          | Pass           |
| TC-16 | Dùng token user thường gọi API thêm   | R2 user token    | N1 valid name                  | —              | Bị từ chối 403                    | **Fail**       |
| TC-17 | Tên danh mục có SQL injection         | R1 admin         | `'; DROP TABLE categories;--`  | —              | Sanitize, không execute SQL       | Pass           |

### BVA Testing

| TC ID  | Mô tả                            | Input      | Biên liên quan            | Kết quả mong đợi                  | Pass/Fail HW02 |
| ------ | -------------------------------- | ---------- | ------------------------- | --------------------------------- | -------------- |
| BVA-01 | Tên rỗng hoàn toàn               | `""`       | On-point length=0         | Báo lỗi bắt buộc nhập tên         | **Fail**       |
| BVA-02 | Tên 1 ký tự                      | `"a"`      | Just above length=1       | Thêm thành công                   | Pass           |
| BVA-03 | Tên 2 ký tự                      | `"ab"`     | In-range length=2         | Thêm thành công                   | Pass           |
| BVA-04 | Tên 255 ký tự                    | 255 ký tự  | Upper boundary            | Thêm thành công hoặc báo lỗi      | Pass           |
| BVA-05 | Tên 256 ký tự                    | 256 ký tự  | Just above upper boundary | Báo lỗi nếu giới hạn VARCHAR(255) | Pass           |
| BVA-06 | Tên 1000 ký tự                   | 1000 ký tự | Far above upper boundary  | Báo lỗi                           | **Fail**       |
| BVA-07 | Tên chỉ có 1 khoảng trắng        | `" "`      | On-point whitespace       | Báo lỗi sau khi trim              | **Fail**       |
| BVA-08 | Tên chỉ có nhiều khoảng trắng    | `"   "`    | On-point whitespace       | Báo lỗi sau khi trim              | **Fail**       |
| BVA-09 | Tên có khoảng trắng đầu + ký tự  | `" a"`     | Just above whitespace     | Thêm thành công, trim space đầu   | Pass           |
| BVA-10 | Tên có khoảng trắng cuối + ký tự | `"a "`     | Just above whitespace     | Thêm thành công, trim space cuối  | Pass           |

### Bug phát hiện (FR-14)

| Bug ID  | Severity | Mô tả                                                    |
| ------- | -------- | -------------------------------------------------------- |
| FR14-01 | Major    | Thêm được danh mục với tên rỗng                          |
| FR14-02 | Minor    | Tên chỉ chứa khoảng trắng vẫn thêm được                  |
| FR14-03 | Minor    | Không giới hạn độ dài tên danh mục                       |
| FR14-04 | Major    | Cho phép thêm danh mục trùng tên                         |
| FR14-05 | Major    | Xóa danh mục đang có sản phẩm liên kết mà không cảnh báo |
| FR14-06 | Critical | User thường dùng token vẫn gọi được API tạo danh mục     |

---

## Tổng hợp

| Feature             | Tổng TC | Domain | BVA    | Pass   | Fail   | Chưa chạy | Bug    |
| ------------------- | ------- | ------ | ------ | ------ | ------ | --------- | ------ |
| FR-02 Login         | 35      | 19     | 16     | 18     | 17     | 0         | 8      |
| FR-08 Checkout      | 25      | 14     | 11     | 11     | 13     | 1         | 4      |
| FR-14 Category CRUD | 27      | 17     | 10     | 15     | 12     | 0         | 6      |
| **Tổng**            | **87**  | **50** | **37** | **44** | **42** | **1**     | **18** |

> **Ghi chú HW04:** Mỗi feature cần automate tối thiểu 12 TC. Ưu tiên các TC có Pass/Fail = **Fail** từ HW02 vì chúng xác nhận bug thực — assertion thất bại sẽ được log thành bug report trên GitHub Issues.
