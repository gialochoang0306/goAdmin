# GoAdmin — Full UI/UX Audit, Critique & Refinement Report

- **Workspace:** `F:\goAdmin`
- **Branch:** `integration/admin-release`
- **Baseline commit:** `fa425d3`
- **Refinement commits:** `22d8a67`, `fbdc12c`, `8a52126`, `9214ab6`, `3f63dae` (plus documentation commit `PRODUCT.md`, `DESIGN.md`, `docs/goAdmin-full-ui-ux-audit.md`)
- **Backend tham chiếu:** `F:\datxebackend` (`integration/backend-release`, read-only)
- **Ecosystem Brand Reference:** `F:\datxe_rn/PRODUCT.md`, `F:\datxe_rn/DESIGN.md`

---

## 1. Executive Summary

GoAdmin được xây dựng trên nền tảng kỹ thuật vững (React 19, TypeScript, Vite 7, Ant Design 6 + `cssVar: { key: "md3" }`, Material Design 3 semantic tokens tại [src/theme/theme.css](file:///F:/goAdmin/src/theme/theme.css), React Query v5, Firebase Auth). Trước tinh chỉnh, các luồng bảo mật và đối soát đã đạt 99/99 unit/integration tests, nhưng trải nghiệm giao diện đa module còn một số bất đồng bộ rõ rệt do tích hợp nhiều phần:

- Sai lệch hợp đồng trạng thái chuyến (`FAILED_SYSTEM` ở backend chưa có trong `RideStatus` / `rideLabels` / `Status` tag và lọt vào bộ lọc `activeStatuses`).
- Màn `VerificationReview` thiếu khung lọc tiêu chuẩn (`<FilterField>` + `.filters`), `<Input.Search>` bị thu hẹp xuống ~28px trên layout thực tế, không có cảnh báo nổi bật khi reviewer xem bản nộp cũ (`revision !== submissionRevision`), nút `Từ chối`/`Thu hồi` thiếu hierarchy `danger`, và drawer vẫn đóng được khi đang lưu quyết định.
- Hỏng tương phản ở một số bề mặt Light/Dark: thẻ `.document-card` và thẻ đánh giá lồng trong `Panel`/`Drawer` hòa màu nền; `.ticket-bubble.admin` (CSKH) và `.chat-message.driver` bị rule `.ticket-bubble` / `.chat-message` đè cùng màu nền với tin nhắn đối phương; tag `purple` ở Dark Mode dùng màu lavender chói; `<Descriptions bordered>` thiếu nền đồng bộ trên Dark Mode.
- Lỗi mật độ và nhất quán điều khiển: `.topbar` cao `80px` và menu item `56px` khiến sidebar tràn cuộn dọc ngay ở viewport desktop chuẩn `1280×720`; `.ant-btn-sm` bị ép cao `40px` / `paddingInline: 24px` làm chật/rớt dòng trong bảng Pricing; icon menu `Bảng giá` trùng `WalletOutlined` với `Yêu cầu rút tiền`; `Vouchers` trộn hai formatter tiền/ngày và còn `opacity: 0.65`; trang `Tickets` và `Withdrawals` đặt `.filters` hoặc `.last-updated` lệch cấu trúc so với các trang khác; route `*` chưa có trang 404 hoàn chỉnh.

Toàn bộ lỗi **P0** (xử lý trạng thái `FAILED_SYSTEM` ở admin UI) và **P1/P2/P3** thuộc phạm vi GoAdmin đã được khắc phục ở lớp theme/shared component trước khi chỉnh từng trang, kiểm chứng trực quan bằng Chromium headless (`1440×900`, `1280×720`, `1024×768`, `768×1024`, `375×812`, zoom `200%`, Light & Dark Mode) và kiểm thử tự động (**12 test files, 107/107 tests pass**).

---

## 2. Skills đã sử dụng & Bằng chứng thực thi

| Skill | Nguồn đã đọc | Cách áp dụng & Bằng chứng thực tế |
| --- | --- | --- |
| **impeccable (v4.9.1)** | `F:\datxe_rn\.agents\skills\impeccable\SKILL.md` cùng các references (`craft-floor.md`, `operate.md`, `audit.md`, `critique.md`, `polish.md`, `harden.md`, `adapt.md`, `optimize.md`, `clarify.md`, `document.md`, `init.md`) | Chạy CLI `F:\datxe_rn\.agents\skills\impeccable\scripts\impeccable.cmd context` (phát hiện thiếu `PRODUCT.md`, `hasVisualImplementation: true`, và `hook-not-installed` drift) và `impeccable.cmd detect --json src` (kết quả `[]`, exit 0). Áp dụng đầy đủ Audit -> Critique -> Polish -> Normalize -> Harden -> Adapt -> Clarify -> Document -> Init (`PRODUCT.md`, `DESIGN.md`). |
| **ui-ux-pro-max** | `C:\Users\quyennv\.agents\skills\ui-ux-pro-max\SKILL.md` | Rà soát phân cấp thông tin admin dashboard, table density, tabular numerals, empty/loading/error state và tính nhất quán bộ lọc. |
| **frontend-design** | `F:\datxe_rn\.agents\skills\frontend-design\SKILL.md` | Rà soát nhịp typography, tonal hierarchy không lạm dụng shadow hay card lồng card, tính mạch lạc thương hiệu PtitGo trên nền AntD + MD3. |
| **react-best-practices** | `C:\Users\quyennv\.codex\.tmp\plugins\plugins\build-web-apps\skills\react-best-practices\SKILL.md` | Kiểm tra lazy loading route/chart, tránh double submit mutation (`isPending` guards), tránh memory leak `URL.revokeObjectURL`, ổn định keys/effects. |
| **Web Design Guidelines** | Kiểm tra thực tế trong workspace/global | **Chưa được cài đặt riêng** trong hệ thống skill; các nguyên tắc WCAG 2.2 AA, keyboard/focus, responsive và zoom được áp dụng thông qua `impeccable/operate.md` + `audit.md` + `react-best-practices`. |

---

## 3. Complete Page & Component Inventory

### Danh sách Routes (`src/App.tsx`)

| Route | Component / Page | Mục tiêu người dùng | Primary Action | Secondary Actions | Thành phần con / Modal / Drawer / Empty & Error | Tình trạng sau Audit |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | `Login` | Đăng nhập cổng quản trị | Nút `Đăng nhập` | Chuyển theme Light/Dark/System | `<Form>`, `<Alert>` lỗi/cấu hình, `<ThemeSwitcher />` | Tốt; tương thích zoom 200%, không tràn mobile |
| `/` -> `/dashboard` | Redirect | Điều hướng mặc định | — | — | `<Navigate replace to="/dashboard" />` | Tốt |
| `/dashboard` | `Dashboard` + `DashboardFinance` + `DashboardCharts` | Theo dõi KPI tài chính, ví, bất thường, hàng đợi nhanh | Chọn kỳ `7 ngày` / `30 ngày`, `Làm mới` | Mở danh sách hồ sơ/chuyến/rút tiền/ticket | `<Segmented>`, `DailyBars` (Recharts), `PaymentDonut`, `<Empty>`, `<QueryError>`, 3 hàng đợi tóm tắt | Tốt; sửa negative gross profit tone & empty chart state |
| `/rides` | `Rides` + `RideTable` | Tìm kiếm, lọc và mở chi tiết chuyến | Tìm kiếm / lọc chuyến / `Mở` nhanh theo ID | Chip lọc nhanh (`Đang hoạt động`, `Chưa có tài xế`, `Hôm nay`), `Xóa bộ lọc`, `Làm mới` | `.filters`, `<FilterField>`, `<RangePicker>`, `<DataTable>`, `<Status>` (`FAILED_SYSTEM` added) | Tốt; thống nhất cột số căn phải |
| `/rides/:id` | `RideDetailPage` + `RideRatings` | Kiểm tra hành trình, tiền chuyến, điều phối và kiểm duyệt đánh giá | `Gán tài xế` / `Gán lại tài xế` / `Hủy chuyến` | `Làm mới`, tab `Biên bản bàn giao`, `Hội thoại`, `Đánh giá` (`Ẩn đánh giá` / `Hiện lại`) | `<Tabs>`, `<Descriptions>`, `<Modal>` Gán/Hủy/Ẩn đánh giá, `<Tag>`, chat bubbles | Tốt; sửa chat bubble, tonal rating items, label accessibility |
| `/drivers` | `Drivers` | Tra cứu danh sách tài xế, lọc trạng thái | Mở hồ sơ tài xế | Tìm theo tên/SĐT, lọc xác minh/kết nối/đánh dấu | `.filters`, `<DataTable>`, `<Status>` | Tốt; căn phải cột số |
| `/drivers/:id` | `DriverDetailPage` | Kiểm tra chi tiết, giấy tờ, kỹ năng, thao tác khóa/duyệt | `Xem và duyệt hồ sơ`, `Đổi trạng thái`, `Ép offline` | Tab `Hồ sơ`, `Giấy tờ`, `Kỹ năng`, `Làm mới` | `<Tabs>`, `<Descriptions>`, `DriverDocumentsDrawer`, `<Modal>`, `<Popconfirm>` | Tốt; sửa `.document-card` surface & contrast |
| `/driver-documents` | `Documents` + `DriverDocumentsDrawer` | Hàng đợi duyệt giấy tờ và tài khoản tài xế | `Xem và duyệt` mở Drawer | Chuyển sang `/driver-documents/verification`, lọc trạng thái, tìm hồ sơ | `.filters`, `<DataTable>`, `DriverDocumentsDrawer` (footersticky, checklist giấy tờ bắt buộc, kỹ năng) | Tốt; làm rõ hierarchy CTA sang eKYC và `.document-card` |
| `/driver-documents/verification` | `VerificationReview` + `FaceComparisonPanel` + `LicensePolicyPreview` | Xét duyệt hồ sơ eKYC phức hợp theo bản nộp | `Lưu quyết định` (`UNDER_REVIEW`/`APPROVED`/`REJECTED`/`NEEDS_MORE_INFO`/`REVOKED`) | Xem theo `snapshot`, đối chiếu khuôn mặt `FaceComparisonPanel`, xem ảnh gốc có bảo mật | `.filters`, `<Table>`, `<Drawer>`, `.verification-capture-grid`, `.verification-decision-box`, `<Alert>` | Tốt; sửa Search width, snapshot warning, danger button, Drawer guard |
| `/customers` | `Customers` | Tra cứu danh sách khách hàng | Mở chi tiết khách hàng | Tìm tên/SĐT/email, lọc trạng thái/đánh dấu/sắp xếp | `.filters`, `<DataTable>`, `<Status>` | Tốt; căn phải cột số |
| `/customers/:id` | `CustomerDetailPage` | Xem hồ sơ, garage phương tiện, lịch sử chuyến và ví khách | `Đổi trạng thái`, `Đánh dấu` | Tab `Hồ sơ`, `Chuyến đi`, `Giao dịch ví`, lọc ví theo ngày/loại/trạng thái | `<Tabs>`, `<Descriptions>`, `RideTable`, `<DataTable>` ví, `<Modal>` | Tốt; căn phải số tiền ví |
| `/tickets` | `Tickets` | Quản lý yêu cầu hỗ trợ | Mở ticket `HT-<id>` | Lọc ngày, vai trò, chủ đề, trạng thái, tìm mã/SĐT | `.filters`, `<DataTable>` (đã chuẩn hóa), `<Tag>` | Tốt; chuẩn hóa dùng `<DataTable>` và tách `.filters` |
| `/tickets/:id` | `TicketDetailPage` | Xử lý hội thoại CSKH hai chiều & cập nhật trạng thái | `Gửi phản hồi` | Chọn `Trạng thái sau phản hồi`, `Đính kèm ảnh`, mở chuyến liên quan | `<Descriptions>`, `.ticket-chat`, `.ticket-composer`, `<Photo>`, `<Image>` | Tốt; tách màu bong bóng CSKH vs User, thêm label & revoke URL |
| `/withdrawals` | `Withdrawals` + `WithdrawalReviewDialog` | Kiểm duyệt lệnh rút tiền ví tài xế | `Duyệt` / `Từ chối` | Sao chép STK, lọc theo SĐT/ngày/trạng thái, `Làm mới` | `.filters`, `<DataTable>`, `WithdrawalReviewDialog` (`<Modal>`) | Tốt; căn padding `<UpdatedAt>`, `<FilterField>`, label proximity |
| `/pricing-rules` | `Pricing` | Quản lý cấu hình giá theo loại xe | `+ Tạo bảng giá`, `Sửa`, `Kích hoạt`/`Tắt` | Lọc mã/loại xe/trạng thái | `.filters`, `<DataTable>`, `<Modal>` Tạo/Sửa & Xác nhận tắt bảng giá cuối | Tốt; icon `TagsOutlined`, `.ant-btn-sm` 32px tránh rớt dòng |
| `/vouchers` | `Vouchers` | Quản lý tổng quỹ, phát hành chiến dịch, xem lịch sử & người nhận | `Lưu tổng quỹ`, `Phát hành chiến dịch mới` | `Lịch sử biến động quỹ`, `Chi tiết` chiến dịch, `Dừng`/`Tiếp tục` | `<Card>`, `<Row>/<Statistic>`, `<Form>`, `<Panel>` + `<Table>`, 2 `<Modal>` | Tốt; thống nhất `money()`/`date()`, bỏ `opacity: 0.65`, guard pending |
| `*` (Unknown route) | `<Result status="404">` (`src/App.tsx`) | Xử lý URL sai không làm người dùng kẹt | `Về trang tổng quan` | Điều hướng qua sidebar | AntD `<Result status="404">` | Đã nâng cấp từ plain text sang `<Result>` chuẩn |

---

## 4. Design System Audit ([src/theme/](file:///F:/goAdmin/src/theme/theme.css))

- **Kiến trúc token nhất quán:** Raw palette đặt tập trung tại [src/theme/theme.css](file:///F:/goAdmin/src/theme/theme.css) (`--md-sys-color-*`), map sang Ant Design 6 tại [src/theme/antdTheme.ts](file:///F:/goAdmin/src/theme/antdTheme.ts) thông qua `cssVar: { key: "md3" }` và tinh chỉnh component rules tại [src/theme/components.css](file:///F:/goAdmin/src/theme/components.css).
- **Vấn đề đã chuẩn hóa ở tầng hệ thống (không vá CSS rời từng trang):**
  1. Bổ sung token biểu đồ/ví `--dashboard-blue`, `--dashboard-blue-light`, `--dashboard-wallet-bg`, `--dashboard-wallet-border`, `--dashboard-accent-bg` cho cả Light và Dark trong [theme.css](file:///F:/goAdmin/src/theme/theme.css), loại bỏ bảng màu cục bộ và `box-shadow` dư trong [dashboard.css](file:///F:/goAdmin/src/pages/dashboard.css).
  2. Bổ sung token `colorFillAlter`, `Descriptions.labelBg`, `Segmented`, `Rate` trong [antdTheme.ts](file:///F:/goAdmin/src/theme/antdTheme.ts) để sửa nền label bảng `<Descriptions bordered>` và `<Segmented>` ở Dark Mode.
  3. Gộp rule trùng lặp `.ant-tag-*`, bổ sung màu Dark/Light cân bằng cho `.ant-tag-purple` và `.ant-tag-cyan`, đồng bộ `.ant-table-cell-fix-left/right` background (tránh cột cố định bị trong suốt hoặc lệch màu khi cuộn), cố định chiều cao `.ant-btn-sm` (`32px` desktop / `40px` coarse pointer) và `.ant-input-search` (`min-width: 240px`).
  4. Gom `prefers-reduced-motion` vào một nơi trong [components.css](file:///F:/goAdmin/src/theme/components.css), loại bỏ bản trùng trong [layout.css](file:///F:/goAdmin/src/layout.css).

---

## 5. Dashboard Audit (`Dashboard.tsx`, `DashboardFinance.tsx`, `DashboardCharts.tsx`)

- **Phân cấp & Trung thực số liệu:** Tách rạch ròi 3 tầng: *Hiệu quả kinh doanh* (GMV, Doanh thu nền tảng, Chi phí khuyến mãi kèm phần quỹ còn lại, Lợi nhuận gộp, Tổng số chuyến + biến động kỳ trước), *Sức khỏe tài chính* (Tổng nghĩa vụ ví, Ví tiền mặt tài xế kèm số tiền đang giữ cho lệnh rút, Ví khách hàng, Ví tín dụng tài xế) và *Biểu đồ & Hàng đợi cần xử lý*.
- **Cải tiến đã thực hiện:**
  - Khi `grossProfit < 0`, metric card Lợi nhuận gộp dùng `tone="negative"` để hiện màu lỗi `--md-sys-color-error`, tránh hiểu nhầm âm thành dương.
  - Khi `data.daily.length === 0`, biểu đồ cột `GMV và doanh thu` hiển thị `<Empty description="Chưa có chuyến hoàn thành trong kỳ." />` thay vì khung trống.
  - Gắn `aria-hidden="true"` cho chấm màu chú giải (`<i />`) và dùng `<Empty>` chuẩn cho hàng đợi `driver-documents` rỗng trên Dashboard.
- **Đối chiếu backend (`AdminDashboardService.kt`):** Công thức `revenue`, `promoCost`, `grossProfit`, `paymentMix` và 4 thành phần `wallets` khớp hợp đồng dữ liệu backend.

---

## 6. Table UX

- Áp dụng đồng bộ `.filters` -> `<DataTable>` (bên trong `<Panel>`) trên toàn bộ danh sách: `Rides`, `Drivers`, `Customers`, `Tickets`, `Withdrawals`, `Pricing`, `Documents`.
- **Tickets:** Chuyển danh sách từ `<Table>` thô tự cấu hình pagination sang `<DataTable>` chuẩn để thống nhất phân trang (`20/50/100`), empty state tiếng Việt và responsive cards trên mobile `xs`.
- **Định dạng & căn lề số liệu:** Áp dụng `font-variant-numeric: tabular-nums` cho `.ant-table-cell-align-right` trong [layout.css](file:///F:/goAdmin/src/layout.css); bổ sung `align: "right"` cho các cột số chuyến, đánh giá, số dư, số tiền, phần trăm trên `Drivers`, `Customers`, `RideTable`, `Pricing`, `Vouchers`, `VerificationReview`.
- **Tránh trùng lặp nút `Xóa bộ lọc`:** Rút kinh nghiệm từ lần test tự động (`documents.test.tsx`, `filters.test.tsx`), không truyền `onReset` tạo nút `"Xóa bộ lọc"` thứ hai vào `<DataTable>` khi trang đó đã đặt nút `"Xóa bộ lọc"` rõ ràng trong thanh `.filters` ngay phía trên bảng.

---

## 7. Form UX

- **Search & Filter bars:** Bọc input tìm kiếm và select bộ lọc trong `.filters` + `<FilterField>` tại `VerificationReview`, `Withdrawals`, `Tickets`, `Drivers`, `Customers`, `Rides`, `Pricing`; thêm `<label>` kết hợp `htmlFor` cho form phản hồi CSKH (`ticket-status-select`, `ticket-reply-input`) và modal ẩn đánh giá (`hide-rating-reason`).
- **Guardrails & Pending State:**
  - `WithdrawalReviewDialog`: tăng khoảng cách/ràng buộc rõ ràng giữa nhãn lý do từ chối và `<TextArea>`; khóa nút trong khi `isPending`.
  - `Vouchers`: khóa bấm lặp ở `onFinish` của form `setBudget` và `createVoucher` khi `isPending`; chuẩn hóa modal body `maxHeight: "72vh", overflowY: "auto"`.
  - `Drivers` / `Customers` / `Rides` / `Pricing` / `VerificationReview`: thêm `closable={!isPending}`, `keyboard={!isPending}`, `mask={{ closable: !isPending }}` để không đóng nhầm modal/drawer khi mutation đang gửi.

---

## 8. Driver Verification UX (Ưu tiên cao nhất)

- **Hai bề mặt bổ trợ rõ rệt:**
  - `/driver-documents` (`Documents` + `DriverDocumentsDrawer`): duyệt nhanh giấy tờ truyền thống (CCCD, GPLX, ảnh chân dung), kiểm tra giấy tờ bắt buộc, kỹ năng, duyệt/từ chối tài khoản cùng cửa sổ. Đã làm rõ đường dẫn sang `/driver-documents/verification` trên heading và cải thiện bề mặt `.document-card` + `max-height: 36vh` cho sticky footer `.driver-review-footer`.
  - `/driver-documents/verification` (`VerificationReview` + `FaceComparisonPanel` + `LicensePolicyPreview`): đối chiếu eKYC theo revision, hiển thị `lockedIdentity` khi `identityLocked = true`, bảng so sánh trường `Đã duyệt trước đó` / `Tài xế xác nhận` / `QR / OCR`.
- **Cải tiến workflow reviewer:**
  - Hiển thị nổi bật `<Alert type="info">` khi xem bản nộp cũ (`revision !== submissionRevision`), nhắc quay lại bản mới nhất để ra quyết định.
  - Sắp xếp ảnh chụp theo lưới `.verification-capture-grid` và thẻ `.verification-capture-card` dễ quét; bảo toàn cơ chế tải ảnh riêng tư qua `verificationFetch(..., { binary: true })` (tạo ObjectURL ngắn hạn theo phiên, không lộ URL công khai).
  - Đóng khung form quyết định bằng `.verification-decision-box`; nút `Lưu quyết định` chuyển sang `danger` khi chọn `Từ chối` (`REJECTED`) hoặc `Thu hồi xác minh` (`REVOKED`).
  - Bảo vệ Drawer không bị đóng ngoài ý muốn khi `decision.isPending`.

---

## 9. Finance & Wallet UX

- Toàn bộ giá trị tiền hiển thị qua `money()` (`src/lib/format.ts`, chuẩn `vi-VN`, đơn vị `₫` / `đ`, `—` khi null/undefined, không biến thiếu dữ liệu thành `0 đ`).
- `Vouchers.tsx` trước đây dùng định dạng riêng (`toLocaleString("vi-VN") + "đ"` và `toLocaleString("vi-VN")` cho ngày) gây lệch format; đã chuẩn hóa về `money()` và `date()`.
- Cột tiền tệ trên `Withdrawals`, `Vouchers`, `Pricing`, `Customers` (ví), `RideTable` căn phải và dùng `tabular-nums`.
- `FAILED_SYSTEM` ở `RideStatus` hiển thị đúng tag đỏ `"Lỗi hệ thống"` thay vì rơi về nhãn mặc định/mã thô.

---

## 10. Navigation & Application Shell UX ([src/App.tsx](file:///F:/goAdmin/src/App.tsx))

- **Sidebar & Topbar:** Thu gọn `.topbar` từ `80px` xuống `64px`, chiều cao item menu `.ant-menu-item` xuống `46px`, giúp toàn bộ 9 module điều hướng hiển thị trọn vẹn không cuộn dọc tại `1280×720` và `1024×768`.
- **Iconography & Breadcrumb:** Sửa icon `/pricing-rules` từ `WalletOutlined` (trùng với `Yêu cầu rút tiền`) sang `TagsOutlined`; thêm `.topbar-breadcrumb` (`<nav aria-label="Đường dẫn hiện tại">`) hiển thị ngữ cảnh con (`Tài xế > #41`, `Duyệt hồ sơ > Xác minh eKYC`, `Hỗ trợ > #77`, `Chuyến đi > #101`, `Khách hàng > #21`).
- **404 Page:** Thay văn bản thô ở route `*` bằng `<Result status="404" title="Không tìm thấy trang" ... />` kèm nút quay về `/dashboard`.

---

## 11. Typography

- Sử dụng nhất quán `fontFamily` (`Google Sans Flex`, `Segoe UI`, `system-ui`, `sans-serif`) và `fontFamilyCode` (`Google Sans Code`, `ui-monospace`, `monospace`) từ tokens.
- Áp dụng `<code>` cho UUID hồ sơ dài trong `VerificationReview`; gắn `tabular-nums` cho toàn bộ cột số liệu căn phải và KPI/ví; bỏ `opacity: 0.65` và `opacity: 0.78` cũ trên `Vouchers` và `RideRatings` (thay bằng `<Typography.Text type="secondary">`).

---

## 12. Light & Dark Mode

- `ThemeSwitcher` (hệ thống / sáng / tối) styled thành pill `40px` hài hòa với topbar; trạng thái được khôi phục sớm trước mount qua [public/theme-init.js](file:///F:/goAdmin/public/theme-init.js).
- Đã kiểm tra và sửa các lỗi tương phản đặc thù Dark Mode:
  - Bong bóng chat CSKH (`.ticket-bubble.admin`) và tài xế (`.chat-message.driver`) phân tách rõ với bong bóng khách hàng.
  - `.document-card` và `.rating-item` nổi rõ khỏi nền `<Panel>` / `<Drawer>` trên cả Light và Dark.
  - `.ant-tag-purple` và `.ant-tag-cyan` trong [components.css](file:///F:/goAdmin/src/theme/components.css) dùng biến MD3 thích ứng Dark Mode thay vì nền sáng chói mặc định.
  - `Descriptions.labelBg` và `colorFillAlter` đồng bộ màu bề mặt Dark Mode.

---

## 13. Responsive & Viewport Behaviour

- **Viewports đã đo đạc trong Chromium headless (Mock QA & `/login`):** `1920×1080`, `1600×900`, `1440×900`, `1366×768`, `1280×720`, `1024×768`, `768×1024`, `390×844`, `375×812`, plus zoom `200%` tại `/login`.
- Toàn bộ 29 lượt kiểm tra ghi nhận `overflowX: false` (không tràn ngang trang), sidebar tự thu vào Drawer di động `< 992px`, `DataTable` chuyển sang card summary dưới `xs` (`< 576px`), các bảng nhiều cột cuộn ngang cục bộ bên trong wrapper bảng (`scroll.x`).
- Nút `.ant-btn-sm` tăng lên `40px` trên thiết bị chạm `@media (pointer: coarse)` để giữ vùng chạm an toàn.

---

## 14. Accessibility

- Giữ `.skip-link` đưa focus tới `#main-content` (`tabIndex={-1}`), `:focus-visible` rõ nét trên nút/link/input.
- Gắn `<label>` và `aria-label` tường minh cho vùng composer reply ticket (`ticket-status-select`, `ticket-reply-input`), modal ẩn đánh giá (`hide-rating-reason`), trường tìm kiếm/bộ lọc ở `VerificationReview`, `Withdrawals`, `Vouchers`.
- Gắn `aria-hidden="true"` cho chấm chú giải màu ở Dashboard; cleanup `URL.revokeObjectURL` khi unmount preview ảnh ở `Tickets` và `VerificationReview`; gom `prefers-reduced-motion` để tôn trọng cài đặt giảm chuyển động.

---

## 15. Performance

- Routes quản trị và `DashboardCharts` (Recharts ~395 kB) được `lazy()` code-splitting tách khỏi bundle lõi (`dist/assets/index-*.js` chỉ 42.79 kB / gzip 15.83 kB; Vite production build hoàn tất trong `7.05s` trên worktree sạch, với cảnh báo chunk `ui-*.js` ~1.31 MB do bundle Ant Design).
- React Query giữ `refetchInterval` hợp lý (Dashboard 30s, Ticket 15s, Ride chat 10s), hỗ trợ `AbortController` khi fetch ảnh eKYC trong `VerificationReview`.

---

## 16. Issue Log (Trước / Sau tinh chỉnh)

| Issue ID | Sev | Route | File chính | Evidence | Root Cause | Proposed Fix | Regression Risk | Test Method | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GA-01` | **P0** | `/rides`, `/rides/:id` | `src/types.ts`, `src/lib/format.ts`, `src/components/common.tsx` | Backend `RideStatus` có `FAILED_SYSTEM` nhưng FE thiếu type/label/tag màu | Chưa đồng bộ enum sau merge backend | Thêm `FAILED_SYSTEM: "Lỗi hệ thống"`, tag `red`, loại khỏi `activeStatuses` | Thấp | Vitest `ui-ux-regressions.test.tsx` | **Fixed** |
| `GA-02` | **P1** | `/driver-documents/verification` | `src/pages/VerificationReview.tsx`, `src/theme/components.css` | Before PNG cho thấy `<Input.Search>` co còn ~28px; xem bản cũ không có cảnh báo; nút Reject cùng màu thường | Không dùng `<FilterField>`, thiếu `min-width`, thiếu `danger` prop và snapshot `<Alert>` | Bọc `.filters` + `<FilterField>`, đặt `min-width: 240px`, thêm `<Alert>` bản cũ, `danger` cho REJECTED/REVOKED, khóa đóng Drawer khi `pending` | Thấp | Vitest `verification-review.test.tsx` + Mock Browser QA | **Fixed** |
| `GA-03` | **P1** | `/tickets/:id`, `/rides/:id` | `src/theme/components.css` | Before Dark PNG cho thấy tin CSKH & tài xế cùng màu nền với user | Rule `.ticket-bubble` / `.chat-message` ghi đè thứ tự CSS | Đặt selector `.ticket-bubble.admin` và `.chat-message.driver` với biến MD3 riêng | Thấp | Mock Browser QA (`ticket-detail-chat-dark.png`, `ride-detail-chat-light.png`) | **Fixed** |
| `GA-04` | **P1** | `/drivers/:id`, `/driver-documents`, `/rides/:id` | `src/theme/components.css`, `src/pages/Rides.tsx` | Thẻ `.document-card` và thẻ đánh giá hòa màu nền `<Panel>`/`<Drawer>` + `opacity: 0.78` | Dùng nền trùng `--surface` thiếu viền/tonal contrast | Chuyển sang tonal `.document-card` & `.rating-item` dùng `--md-sys-color-surface-container-high` + viền `--outline-variant` | Thấp | Vitest + Mock Browser QA | **Fixed** |
| `GA-05` | **P1** | Shell (`*`) | `src/layout.css`, `src/theme/components.css`, `src/App.tsx` | Before `1280×720` sidebar bị scrollbar dọc; `/pricing-rules` trùng icon `WalletOutlined`; route `*` trả plain div | Topbar `80px`, Menu item `56px`, thiếu route 404 `<Result>` & breadcrumb | Giảm topbar `64px`, menu `46px`, đổi `TagsOutlined`, thêm `.topbar-breadcrumb` & `<Result status="404">` | Thấp | Vitest + Mock Browser QA (`dashboard-1280x720`, `not-found-light`) | **Fixed** |
| `GA-06` | **P1** | `/dashboard` | `src/pages/DashboardFinance.tsx`, `src/pages/dashboard.css` | Lợi nhuận gộp âm vẫn hiện tone xanh lá; daily rỗng hiện khung trống | Thiếu điều kiện `grossProfit < 0` & `!data.daily.length` | Thêm `tone="negative"`, `<Empty>` khi không có dữ liệu ngày, bỏ `box-shadow` & palette trùng | Thấp | Vitest `ui-ux-regressions.test.tsx` + Mock Browser QA | **Fixed** |
| `GA-07` | **P1** | `/vouchers` | `src/pages/Vouchers.tsx`, `src/theme/components.css` | Trộn `toLocaleString` + `"đ"` thay vì `money()`/`date()`; Tag `purple` chói ở Dark; thiếu guard `isPending` trong `onFinish` | Viết hàm format riêng ở page và thiếu rule `.ant-tag-purple` dark | Chuyển về `money()` & `date()`, thêm rule `.ant-tag-purple`/`cyan`, guard `isPending`, thay `opacity: 0.65` | Trung bình | Vitest `ui-ux-regressions.test.tsx` + `admin-integration.test.tsx` | **Fixed** |
| `GA-08` | **P2** | `/pricing-rules` | `src/theme/components.css` | Before `pricing-light` các nút bảng `.ant-btn-sm` bị ép `40px`/`24px` gây rớt dòng | Token `Button.controlHeightSM: 40`, `paddingInline: 24` quá lớn cho nút `small` | Chỉnh `.ant-btn-sm` `32px` (mobile coarse `40px`) với padding gọn | Thấp | Mock Browser QA (`pricing-light-1440.png`) | **Fixed** |
| `GA-09` | **P2** | `/tickets`, `/withdrawals` | `src/pages/Tickets.tsx`, `src/pages/Withdrawals.tsx` | Bộ lọc nằm sai cấp hoặc `.last-updated` dính sát mép `<Panel>`; `Tickets` thiếu `<DataTable>` | Không dùng chung wrapper `.filters` + `<DataTable>` | Tách `.filters` & `<UpdatedAt>` ra ngoài `<Panel>`, dùng `<DataTable>` cho `Tickets` | Thấp | Vitest `filters.test.tsx` + `ui-ux-regressions.test.tsx` + Mock QA | **Fixed** |
| `GA-10` | **P2** | Global Dark Mode | `src/theme/antdTheme.ts` | `<Descriptions bordered>` label sáng/lệch màu trong Dark Mode | Thiếu `Descriptions.labelBg` và `colorFillAlter` trong `antdTheme.ts` | Map `labelBg` & `colorFillAlter` sang `--md-sys-color-surface-container-high` | Thấp | Mock Browser QA (`vouchers-dark-1440.png`) | **Fixed** |
| `GA-11` | **P2** | `/tickets/:id`, `/rides/:id` | `src/pages/Tickets.tsx`, `src/pages/Rides.tsx` | Thiếu `<label htmlFor>` cho composer reply và textarea ẩn đánh giá; thiếu revoke preview URL on unmount | Chưa gắn label DOM cho form ngoài `<Form.Item>` | Bổ sung `<label htmlFor>` + `useEffect` `URL.revokeObjectURL` cleanup | Thấp | Vitest `ui-ux-regressions.test.tsx` | **Fixed** |
| `GA-12` | **P3** | Tables | `src/layout.css`, `Drivers.tsx`, `Customers.tsx`, `RideTable.tsx`, `Pricing.tsx` | Cột số lượng/tiền căn trái thiếu thẳng hàng dọc | Thiếu `align: "right"` và `tabular-nums` | Thêm `.ant-table-cell-align-right` (`tabular-nums`) và căn phải các cột số | Thấp | Mock Browser QA | **Fixed** |

---

## 17. Bảng tổng hợp theo Route & Xếp hạng trước/sau

### Ma trận kiểm tra theo Route

| Route | P0 | P1 | P2 | P3 | Fixed | Remaining | Source QA | Browser QA | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/login` | 0 | 0 | 0 | 1 | 1 | 0 | Pass | Pass (Unmodified Vite 4173: Light, Dark, 375px, 200% zoom) | Ready (UI) |
| `/dashboard` | 0 | 1 | 1 | 1 | 3 | 0 | Pass | Pass (Mock QA 4174: Light/Dark + 9 viewports) | Ready (Mock QA) |
| `/rides` | 1 | 0 | 1 | 1 | 3 | 0 | Pass | Pass (Mock QA 4174) | Ready (Mock QA) |
| `/rides/:id` | 1 | 2 | 1 | 0 | 4 | 0 | Pass | Pass (Mock QA 4174: chat Light, ratings Dark) | Ready (Mock QA) |
| `/drivers` | 0 | 0 | 1 | 1 | 2 | 0 | Pass | Pass (Mock QA 4174) | Ready (Mock QA) |
| `/drivers/:id` | 0 | 1 | 0 | 0 | 1 | 0 | Pass | Pass (Mock QA 4174: docs tab) | Ready (Mock QA) |
| `/driver-documents` | 0 | 1 | 1 | 0 | 2 | 0 | Pass | Pass (Mock QA 4174: list + Drawer) | Ready (Mock QA) |
| `/driver-documents/verification` | 0 | 2 | 1 | 0 | 3 | 0 | Pass | Pass (Mock QA 4174: queue + Review Drawer) | Ready (Mock QA) |
| `/customers` | 0 | 0 | 0 | 1 | 1 | 0 | Pass | Pass (Mock QA 4174) | Ready (Mock QA) |
| `/customers/:id` | 0 | 0 | 1 | 1 | 2 | 0 | Pass | Pass (Mock QA 4174: wallet Dark) | Ready (Mock QA) |
| `/tickets` | 0 | 0 | 2 | 0 | 2 | 0 | Pass | Pass (Mock QA 4174) | Ready (Mock QA) |
| `/tickets/:id` | 0 | 1 | 1 | 0 | 2 | 0 | Pass | Pass (Mock QA 4174: chat Dark) | Ready (Mock QA) |
| `/withdrawals` | 0 | 0 | 2 | 0 | 2 | 0 | Pass | Pass (Mock QA 4174) | Ready (Mock QA) |
| `/pricing-rules` | 0 | 0 | 2 | 0 | 2 | 0 | Pass | Pass (Mock QA 4174) | Ready (Mock QA) |
| `/vouchers` | 0 | 1 | 2 | 0 | 3 | 0 | Pass | Pass (Mock QA 4174: Dark modal & ledger) | Ready (Mock QA) |
| `*` (404) | 0 | 1 | 0 | 0 | 1 | 0 | Pass | Pass (Mock QA 4174: `not-found-light-1440.png`) | Ready (Mock QA) |

> *Ghi chú phạm vi Browser QA:* Trang `/login` chạy trực tiếp trên dev server gốc (`127.0.0.1:4173`). Toàn bộ các route sau đăng nhập được kiểm tra trực quan qua harness Mock QA cô lập (`127.0.0.1:4174`, dữ liệu tổng hợp giả lập, không kết nối production và đã xóa khỏi workspace trước khi commit); 29 ảnh chụp Before/After lưu ngoài repo trong thư mục scratch của phiên làm việc, **không commit ảnh chụp màn hình nào vào Git**. Kiểm thử E2E trực tiếp với tài khoản admin thật trên backend đang **BLOCKED** do không được cung cấp thông tin đăng nhập quản trị.

### Đánh giá chuyên môn Trước / Sau (thang điểm 10)

> *Đây là điểm đánh giá chuyên môn dựa trên rà soát mã nguồn, kiểm tra đối chiếu AntD/MD3 tokens và 29 ảnh chụp Chromium headless trước/sau chỉnh sửa.*

| Hạng mục | Trước | Sau | Lý do cải thiện chính |
| --- | --- | --- | --- |
| Visual consistency | 7.2 | 9.0 | Đồng bộ `.document-card`, `.rating-item`, `.ant-tag-purple/cyan`, `<Descriptions bordered>`, icon menu `TagsOutlined`, bỏ duplicate CSS/shadow. |
| Typography | 7.8 | 8.8 | Bổ sung `tabular-nums` toàn bảng căn phải, `<code>` cho UUID eKYC, bỏ `opacity` làm mờ chữ phụ. |
| Information hierarchy | 7.5 | 8.9 | Tách `.filters` khỏi `<Panel>`, cảnh báo bản nộp cũ & `grossProfit` âm rõ màu, giữ hierarchy nút Reject `danger`. |
| Dashboard usability | 8.0 | 9.0 | Empty chart fallback rõ ràng, xử lý lợi nhuận âm, chuẩn hóa `aria-hidden` & Dark Mode blue/wallet tokens. |
| Table usability | 7.6 | 8.8 | Căn phải & thẳng hàng cột số liệu, đồng bộ `Tickets` sang `<DataTable>`, sửa nút `.ant-btn-sm` trong bảng không rớt dòng. |
| Form usability | 7.4 | 8.8 | Bổ sung `.filters`/`<FilterField>` ở `VerificationReview`, khóa nút & modal/drawer khi `isPending`, chuẩn hóa label & validation. |
| Navigation | 7.3 | 9.0 | Sidebar vừa `1280×720` không cuộn, topbar `64px`, breadcrumb module > item ở chi tiết, trang 404 `<Result>`. |
| Accessibility | 7.6 | 8.7 | Thêm `<label htmlFor>`, gom `prefers-reduced-motion`, kích thước chạm `40px` coarse pointer, làm sạch mô tả tương phản Dark Mode. |
| Responsive | 8.0 | 9.0 | Kiểm chứng `overflowX: false` trên 9 kích thước viewport từ `375px` đến `1920px` + zoom `200%` tại `/login`. |
| Interaction quality | 7.5 | 8.9 | Chống double submit, giữ modal/drawer mở khi pending, sửa màu phân biệt người gửi/CSKH/tài xế trong chat. |

---

## 18. Verification & Regression Test Evidence

Kết quả kiểm chứng chạy sau lần chỉnh sửa code và test cuối cùng (commit code/test `3f63dae`):

1. **`pnpm.cmd lint`** (`eslint .`): **PASS** (exit 0).
2. **`pnpm.cmd typecheck`** (`tsc --noEmit`): **PASS** (exit 0).
3. **`pnpm.cmd test`** (`vitest run --configLoader runner`): **PASS — 12/12 test files, 107/107 tests passed, 0 skipped** (99 baseline + 8 test bổ sung trong `verification-review.test.tsx` và `ui-ux-regressions.test.tsx`).
4. **`pnpm.cmd build`** (`tsc --noEmit && vite build --configLoader runner`): **PASS** (`3624 modules transformed`, built in `6.20s`).
5. **`git diff --check`**: **PASS** (exit 0).
6. **Clean-checkout verification (`git worktree add --detach %TEMP%\goadmin-clean-check HEAD` tại `3f63dae`):**
   - `pnpm.cmd install --frozen-lockfile`: **PASS** (`452 packages`, `11.3s`).
   - `pnpm.cmd lint`: **PASS** (exit 0).
   - `pnpm.cmd typecheck`: **PASS** (exit 0).
   - `pnpm.cmd build`: **PASS** (built in `7.05s`).

---

## 19. Các vấn đề chưa xác minh / Blockers

- **Live-backend authenticated E2E (BLOCKED):** Không có tài khoản Admin Firebase Auth + backend chạy thực để kiểm tra flow đăng nhập thật -> gọi API thật -> render dữ liệu thật. Toàn bộ kiểm thử UI sau đăng nhập dựa trên Vitest API mocks và harness Mock Browser QA.
- **Trình duyệt ngoài Chromium & thiết bị cảm ứng thật:** Mới kiểm chứng trực quan bằng Chromium headless trên Windows; chưa test trực tiếp trên Safari macOS/iOS hoặc màn hình cảm ứng thật.
- **Tải dữ liệu cực lớn & i18n mở rộng:** Chưa đo hiệu năng render bảng khi có hàng nghìn bản ghi trả về từ server thực hoặc trường hợp mạng chậm làm `verificationFetch` timeout liên tục trên nhiều ảnh eKYC cùng lúc.

---

## 20. Release Readiness

Ở góc độ UI/UX và chất lượng mã nguồn frontend trên nhánh `integration/admin-release`, **GoAdmin sẵn sàng phát hành** sau khi vượt qua bước smoke-test đăng nhập thực tế (UAT với tài khoản admin trên môi trường staging kết nối `F:\datxebackend`): toàn bộ các đường dẫn nghiệp vụ chính và phụ đều thống nhất theo một ngôn ngữ thiết kế Ant Design + Material Design 3, đầy đủ bảo vệ an toàn tài chính và xét duyệt eKYC, sạch cảnh báo lint/typecheck/build và đạt 107/107 regression tests.
