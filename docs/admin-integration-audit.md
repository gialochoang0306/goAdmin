# GoAdmin — Báo cáo Tích hợp, Kiểm thử Hợp đồng Backend & Sẵn sàng Phát hành

- **Workspace:** `F:\goAdmin`
- **Nhánh phát hành:** `integration/admin-release`
- **Nhánh sao lưu trước merge:** `backup/admin-before-merge` (`0dbe6c8`)
- **Base cục bộ trước tích hợp:** `8e78af4`
- **Remote tích hợp:** `origin/main` (`6bbdda8`)
- **Merge commit:** `80aba49` (`Merge remote-tracking branch 'origin/main' into integration/admin-release`)
- **Backend & eKYC đối chiếu:** `F:\datxebackend` (`integration/backend-release`), `F:\ekyc-service`

---

## 1. Bảo toàn thay đổi cục bộ & Sao lưu (Phase 1)

Trước khi merge `origin/main`, toàn bộ thay đổi cục bộ chưa commit (bao gồm hệ thống xác minh eKYC bản địa, cập nhật bảng giá theo danh mục xe, lọc tài xế gán cuốc, nâng cấp Vitest `4.1.12` và workflow CI `.github/workflows/ci.yml`) đã được kiểm tra bí mật/PII, xác minh vượt qua toàn bộ kiểm thử (`89/89`), và đóng gói thành 3 commit có cấu trúc:

1. `29e042a` — `chore(ci,deps): upgrade Vitest 4.1.12, stabilize jsdom env and add CI workflow`
2. `fe13dd1` — `feat(admin): add native eKYC verification review workflow and enhance document frames`
3. `0dbe6c8` — `feat(admin): integrate vehicle catalog pricing options and assignable driver filtering`

- **Sao lưu:** Nhánh `backup/admin-before-merge` trỏ tới `0dbe6c8`.
- **Kiểm tra bí mật & lịch sử Git:** Tệp theo dõi `.env.example` chỉ chứa tên biến; `.env.production` chỉ chứa `VITE_API_BASE_URL=https://api.ptitgo.me`; `.env` và `.env.local` được loại trừ trong `.gitignore`; không phát hiện private key, Firebase admin credential hoặc PII mẫu nhạy cảm trong Git.

---

## 2. Phân tích & Merge Remote (`origin/main`, Phase 2–3)

`origin/main` (`8e78af4..6bbdda8`) gồm 9 commit:

- `795cef8` — Đổi tên mục voucher sang khuyến mãi, bổ sung ngân sách chiến dịch và xem trước thông báo
- `f298d69` — Bổ sung kiểm duyệt đánh giá 2 chiều theo chuyến (`/api/admin/ratings`)
- `2fe6420` — Merge PR #4 (`feat/rating-system`)
- `e1c31cc` — Khắc phục ô thao tác cố định bị xuyên thấu khi cuộn/hover bảng
- `b5bfd6f` — Từ chối ngày tạo trong tương lai và chặn làm mới khi khoảng ngày không hợp lệ
- `1af0d67`, `a251cee`, `ca894cd`, `6bbdda8` — Bảo toàn ngày nhập dở đến khi xác nhận (`fix/admin-date-validation`)

Xác nhận cả `origin/feat/rating-system` và `origin/fix/admin-date-validation` đã nằm trong `origin/main` (`6bbdda8`), không tự ý merge nhánh ngoài luồng.

Merge `origin/main` (`80aba49`) vào `integration/admin-release` diễn ra sạch qua `ort`. Bảy tệp giao thoa (`README.md`, `src/App.tsx`, `src/components/common.tsx`, `src/layout.css`, `src/lib/api.ts`, `src/pages/Rides.tsx`, `src/test/workflows.test.tsx`) đều được rà soát từng dòng và giữ nguyên cả tính năng cục bộ lẫn tính năng từ remote.

---

## 3. Đối chiếu Hợp đồng Backend & Khắc phục Hậu-merge (Phase 4–6)

Đối chiếu trực tiếp mã nguồn controller, DTO và service trong `F:\datxebackend` (`integration/backend-release`) và `F:\ekyc-service`:

| Nghiệp vụ | Backend (`F:\datxebackend` / `F:\ekyc-service`) | Trạng thái GoAdmin & Sửa lỗi áp dụng |
| --- | --- | --- |
| **KPI Tài chính Dashboard** | `AdminDashboardService.kt`: `promoCost` là tổng giảm giá phát sinh **trong kỳ** (`grossProfit = revenue - promoCost`) | **Đã sửa (`src/pages/DashboardFinance.tsx`):** Trước merge, `795cef8` hiển thị nhầm `promoBudget.budgetLimit` làm giá trị chính của thẻ *Chi phí khuyến mãi*, gây lệch với *Lợi nhuận gộp*. Đã khôi phục giá trị chính là `data?.promoCost` và chuyển `promoBudget.availableAmount` + liên kết `/vouchers` xuống phần chi tiết phụ. |
| **Quản lý Khuyến mãi & Ngân sách** | `AdminVoucherController.kt`, `AdminVoucherService.kt`, `PromoBudgetService.kt` | **Đã gia cố (`src/pages/Vouchers.tsx`, `src/layout.css`):** Đồng bộ `budgetForm` theo dữ liệu mới qua `useEffect`; chuẩn hóa mã chiến dịch `trim().toUpperCase()` + regex `^[A-Za-z0-9_-]{3,50}$`; giới hạn `PERCENT` trong `1..100%`; kiểm tra `validTo > validFrom`; ràng buộc `campaignBudgetLimit >= maxDiscount` (hoặc `value` với `FIXED`); bổ sung `QueryError` cho quỹ, sổ cái và danh sách; thay màu hex/rgba nền tối cứng sang token MD3 `--md-sys-color-*` (Light/Dark WCAG 2.2 AA), grid responsive và `scroll={{ x: "max-content" }}` cho bảng trong Modal. |
| **Đánh giá 2 chiều & Gán tài xế** | `AdminRatingController.kt`, `AdminRideController.kt`, `AdminRideService.kt` | **Đã sửa (`src/pages/Rides.tsx`):** Chuyển `<Space direction="vertical">` sang `orientation="vertical"` và `<Alert message>` sang `title` theo chuẩn AntD 6; khóa nút thao tác & modal trong khi đang gửi yêu cầu đổi trạng thái hiển thị đánh giá; thêm optional chaining `customer.data?.vehicles?.find(...)`; bỏ qua gọi `POST /assignable-drivers` khi danh sách ứng viên rỗng. |
| **Ví & Giao dịch khách hàng** | `AdminWalletFilter.kt` | **Đã đồng bộ (`src/pages/Customers.tsx`, `src/lib/format.ts`, `src/components/common.tsx`):** Bổ sung đủ loại giao dịch hợp lệ (`TOP_UP`, `RIDE_PAYMENT`, `TRIP_EARNING`), nhãn tiếng Việt cho giao dịch/trạng thái ví (`SUCCESS`, `FAILED`) và màu trạng thái tương ứng trong `<Status />`. |
| **Bảo mật ảnh & XSS** | — | **Đã sửa (`src/pages/Tickets.tsx`):** Lọc `message.imageUrl` trong khung hội thoại hỗ trợ qua `safeImage()` (chỉ cho phép `https:`), ngăn hiển thị URL scheme không an toàn như `javascript:` hay `http:`. |
| **Bảng giá, Rút tiền & eKYC** | `AdminPricingRuleController.kt`, `AdminWithdrawalController.kt`, `driver_verification.py` | Khớp hoàn toàn về kiểu dữ liệu, kiểm tra ngân hàng, khóa gửi trùng và gửi `revision` / `submissionRevision` trong `VerificationReview.tsx` + `WithdrawalReviewDialog.tsx`. |

Ngoài ra đã làm sạch `src/lib/api.ts` (import tường minh `AdminRatingItem`, `CampaignClaimant`, `BudgetLedgerItem` thay cho inline `import("../types")`).

---

## 4. Kiểm tra Trực quan Trình duyệt (Phase 7)

Chạy Vite dev server cục bộ tại `http://127.0.0.1:4173/login` và kiểm tra thực tế trên trình duyệt ở hai chế độ Light/Dark cùng nhiều khung hình:

- **Console & Asset:** `0` lỗi console, `0` lỗi runtime JS; toàn bộ asset cục bộ và font `google-sans-flex-*.woff2` tải HTTP `200`/`304`.
- **Viewports đã kiểm tra:** Desktop `1920x1080`, `1440x900`, `1366x768`, `1280x720`, Tablet `768x1024`, Mobile `375x812`, và mức thu phóng quy đổi `125%` (`1152x720`), `150%` (`960x600`), `200%` (`720x450`).
- **Lỗi phát hiện & đã sửa:** Ở mức thu phóng `200%` (`720x450`), nút chọn giao diện góc trên phải ban đầu đè lên góc thẻ đăng nhập. Đã bổ sung `@media (max-width: 820px)` trong `src/layout.css` (`.login-page { padding-top: 84px; }` và `.login-theme { right: 16px; top: 16px; }`) và xác minh lại ở `720x450` và `768x1024` cả Light lẫn Dark mode: tách biệt rõ ràng (khoảng hở `12px`), `0` tràn ngang.

---

## 5. Kết quả Kiểm thử, Bảo mật Phụ thuộc & Sẵn sàng Phát hành (Phase 8)

- **Commit xử lý hậu-merge & hồi quy:** `5e7246b` (`fix(admin): reconcile post-merge dashboard, voucher, rating and security regressions`)
- **Linter & TypeScript:** `pnpm.cmd lint` (`eslint .`) và `pnpm.cmd typecheck` (`tsc --noEmit`) đều trả mã `0`.
- **Vitest (`Vitest v4.1.12`):** `pnpm.cmd test` đạt **11/11 test files, 99/99 tests pass** (gồm 95 test hậu-merge ban đầu và 4 test hồi quy mới trong `src/test/admin-integration.test.tsx`).
- **Production Build:** `pnpm.cmd build` (`vite v7.3.7`) biên dịch `dist/` thành công trong `6.64s`.
- **Kiểm chứng checkout sạch (`git worktree`):** Đã kiểm chứng `pnpm.cmd install --frozen-lockfile` (`452` packages trong `7.3s`) và `pnpm.cmd build` (`7.28s`) tại commit `5e7246b` trên thư mục worktree sạch trước khi dọn dẹp worktree.
- **Audit phụ thuộc (`pnpm.cmd audit`):** **0 lỗ hổng Critical** và **0 cảnh báo Tinypool**; chỉ còn 4 cảnh báo transitive (`2 high`, `1 moderate`, `1 low`) nằm trong `firebase > @firebase/firestore > @grpc/grpc-js` và `typescript-eslint` (`picomatch`, `minimatch`), không ảnh hưởng bundle runtime hay Vitest runner.
- **Kết luận:** Nhánh `integration/admin-release` ở trạng thái sạch, sẵn sàng cho review/release; **không tự động push, merge `main` hay deploy** theo đúng giới hạn nhiệm vụ.
