# Design System — GoAdmin

Ngôn ngữ thiết kế của GoAdmin kết hợp **Ant Design 6** (component runtime qua `ConfigProvider` ở [src/theme/antdTheme.ts](file:///F:/goAdmin/src/theme/antdTheme.ts)) với hệ thống **Material Design 3 semantic tokens** (định nghĩa tại [src/theme/theme.css](file:///F:/goAdmin/src/theme/theme.css)) và chia sẻ nhận diện thương hiệu với hệ sinh thái PtitGo.

## 1. Kiến trúc Token & Bề mặt (Color & Surface Hierarchy)

Nguyên tắc cốt lõi: **palette thô chỉ sống trong `src/theme/theme.css`**, toàn bộ component, Ant Design `cssVar: { key: "md3" }` và page CSS chỉ tiêu thụ `--md-sys-*`, `--app-color-*` hoặc `--dashboard-*`. Không tạo shadow nổi nặng (`boxShadow: "none"` toàn cục); dùng chênh lệch tonal giữa nền canvas, card chứa và header bảng để phân tách tầng thông tin.

### Bề mặt Light & Dark Mode

| Role token | Light Mode | Dark Mode (`[data-theme="dark"]`) | Mục đích sử dụng |
| --- | --- | --- | --- |
| `--md-sys-color-primary` | `#8f3d4b` | `#ffb2bf` | Hành động chính, link điều hướng, điểm nhấn thương hiệu PtitGo |
| `--md-sys-color-on-primary` | `#ffffff` | `#561d2a` | Chữ/icon trên nút chính và bong bóng CSKH |
| `--md-sys-color-primary-container` | `#ffdadf` | `#723340` | Container nhấn thương hiệu |
| `--md-sys-color-surface` | `#f0f4f9` | `color-mix(2% primary, #131314)` | Nền chính trang quản trị |
| `--md-sys-color-surface-container-low` | `#f0f4f9` | `color-mix(3% primary, #131314)` | Sidebar, Drawer nền |
| `--md-sys-color-surface-container` | `#ffffff` | `color-mix(4% primary, #1e1f20)` | Panel, Card, Table container, Modal chi tiết |
| `--md-sys-color-surface-container-high` | `#f0f4f9` | `color-mix(5% primary, #1e1f20)` | Khối tonal phụ (ô tài liệu, thẻ đánh giá, label `<Descriptions>`) |
| `--md-sys-color-surface-container-highest` | `#e9eef4` | `color-mix(5% primary, #282a2c)` | Header bảng (`Table.headerBg`), track thanh phân đoạn |
| `--md-sys-color-outline` | `#747775` | `#8e918f` | Viền input/button và phân tách tương phản >= 3:1 |
| `--md-sys-color-outline-variant` | `#e3e3e3` | `#333537` | Đường chia bảng, viền panel nhẹ |

### Token Trạng thái & Data Visualization

| Nhóm | Token chính | Light | Dark | Ứng dụng |
| --- | --- | --- | --- | --- |
| Success | `--md-sys-color-success` / `-container` | `#326941` / `#b4f1bd` | `#99d5a3` / `#174f2b` | Hoàn thành, Đã duyệt, Hoạt động, xu hướng dương |
| Warning | `--md-sys-color-warning` / `-container` | `#765a12` / `#ffdf93` | `#e8c16b` / `#5a4300` | Chờ duyệt, Đang xét duyệt, sai lệch QR/OCR, sao đánh giá |
| Error | `--md-sys-color-error` / `-container` | `#ba1a1a` / `#ffdad6` | `#ffb4ab` / `#93000a` | Từ chối, Bị khóa, Hủy, lợi nhuận âm (`data-tone="negative"`) |
| Info | `--md-sys-color-info` / `-container` | `#245e91` / `#d0e4ff` | `#9ecaff` / `#004776` | Đang xử lý, Chuyến đã ghép/đang chạy |
| Dashboard Viz | `--dashboard-blue`, `--dashboard-wallet-bg`, `--dashboard-wallet-border` | `#2457c6`, `#eef4ff`, `#d9e5fc` | `#5b8afa`, `#19263c`, `#34486b` | Biểu đồ GMV/Doanh thu và nhóm Sức khỏe ví |

## 2. Typography & Định dạng số

- **Font UI:** `--md-sys-typescale-font-family: "Google Sans Flex", "Segoe UI", system-ui, sans-serif` (`14px` base).
- **Font mã / UUID / Biển số:** `--md-sys-typescale-code-font-family: "Google Sans Code", ui-monospace, monospace`.
- **Phân cấp tiêu đề:**
  - Tiêu đề trang (`PageHeader`): `h1` `28px` / weight `600` (`clamp(22px, 3vw, 28px)`), letter-spacing `-0.02em`.
  - Tiêu đề khối (`Panel` / Section): `16px` / weight `600`.
  - Giá trị KPI tài chính (`KpiTile` / `.kpi-value`): `24px`–`28px` / weight `700` kèm `font-variant-numeric: tabular-nums`.
  - Bảng dữ liệu số liệu (tiền tệ, tỷ lệ, số chuyến, khoảng cách): dùng cột `align: "right"` + `tabular-nums` để căn thẳng hàng dọc.
  - Chuẩn định dạng chung từ `src/lib/format.ts`: tiền qua `money()`, ngày giờ qua `date()`, múi giờ Việt Nam qua `dateFilter()`.

## 3. Shape, Sizing & Layout Rules

- **Bo góc:** `12px` chuẩn cho input/panel/card (`--md-sys-shape-corner-md`), `16px` cho khung lớn (`--md-sys-shape-corner-lg`), `28px` cho Modal (`borderRadiusLG: 28`), `9999px` pill cho Button, Menu active item, ThemeSwitcher và Tag.
- **Kích thước vùng chạm & mật độ điều khiển:**
  - Button tiêu chuẩn: `40px`; Button nhỏ trong bảng (`.ant-btn-sm`): `32px` trên desktop (chuột) và `40px` trên thiết bị cảm ứng (`@media (pointer: coarse)`).
  - Input / Select bộ lọc: `40px` (`.filters`); Input biểu mẫu chính / đăng nhập: `40px–56px`.
  - Topbar cố định `64px`; Sidebar desktop rộng `232px` với chiều cao mục menu `46px` để hiển thị trọn vẹn 9 module mà không cuộn dọc ở `1280×720`.
- **Tách vùng nhất quán:**
  - Bộ lọc danh sách (`.filters` với `<FilterField>`) đứng bên ngoài `<Panel>` bảng hoặc làm dải điều khiển độc lập phía trên bảng; không lồng card thừa bên trong card (thay bằng khối tonal `.document-card`, `.rating-item`, `.verification-capture-card`, `.verification-decision-box`).
  - Màn chi tiết và trang con hiển thị breadcrumb dẫn ngược về module gốc ở Topbar (`Tài xế > #41`, `Duyệt hồ sơ > Xác minh eKYC`).

## 4. Accessibility & Motion

- **Focus & Keyboard:** `:focus-visible` hiển thị viền `2px solid var(--md-sys-color-primary)` rõ ràng; liên kết nhảy nhanh `.skip-link` đưa focus vào `#main-content` (`tabIndex={-1}`).
- **Labeling:** Mọi input lọc, form reply ticket, modal reason đều gắn `<label>` visible hoặc `aria-label` tường minh; các icon trang trí gắn `aria-hidden`.
- **Reduced Motion:** Tôn trọng `@media (prefers-reduced-motion: reduce)` trong [src/theme/components.css](file:///F:/goAdmin/src/theme/components.css), tắt transition/animation khi người dùng bật giảm chuyển động.

