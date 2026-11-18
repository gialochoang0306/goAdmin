---
name: GoAdmin (PtitGo Web Admin)
description: Material Design 3 semantic token layer over Ant Design 6 for PTITgo Vietnamese operations, eKYC verification, support, and financial administration.
colors:
  crimson-primary: "#8f3d4b"
  crimson-on-primary: "#ffffff"
  crimson-primary-container: "#ffdadf"
  crimson-on-primary-container: "#3b0716"
  crimson-primary-dark: "#ffb2bf"
  crimson-on-primary-dark: "#561d2a"
  crimson-primary-container-dark: "#723340"
  slate-secondary: "#444746"
  slate-secondary-container: "#e3e9f0"
  slate-on-secondary-container: "#1f1f1f"
  slate-secondary-dark: "#c4c7c5"
  slate-secondary-container-dark: "#333537"
  amber-tertiary: "#795831"
  amber-tertiary-container: "#ffddb6"
  surface-canvas-light: "#f0f4f9"
  surface-card-light: "#ffffff"
  surface-highest-light: "#e9eef4"
  ink-on-surface-light: "#1f1f1f"
  ink-muted-light: "#444746"
  outline-light: "#747775"
  outline-variant-light: "#e3e3e3"
  surface-canvas-dark: "#131314"
  surface-card-dark: "#1e1f20"
  surface-highest-dark: "#282a2c"
  ink-on-surface-dark: "#e3e3e3"
  ink-muted-dark: "#c4c7c5"
  outline-dark: "#8e918f"
  outline-variant-dark: "#333537"
  success: "#326941"
  success-container: "#b4f1bd"
  warning: "#765a12"
  warning-container: "#ffdf93"
  error: "#ba1a1a"
  error-container: "#ffdad6"
  info: "#245e91"
  info-container: "#d0e4ff"
  dashboard-blue: "#2457c6"
  dashboard-blue-light: "#8db8fa"
  dashboard-wallet-bg: "#eef4ff"
  dashboard-wallet-border: "#d9e5fc"
typography:
  display:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
  section:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
  brand:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.15
  subhead:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.35
  code:
    fontFamily: "Google Sans Code, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  overline:
    fontFamily: "Google Sans Flex, Segoe UI, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0.06em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "28px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.crimson-primary}"
    textColor: "{colors.crimson-on-primary}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "40px"
  button-default:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.crimson-primary}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "40px"
  button-sm:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.crimson-primary}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "32px"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.crimson-on-primary}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "40px"
  card-panel:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.ink-on-surface-light}"
    rounded: "{rounded.md}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.ink-on-surface-light}"
    rounded: "{rounded.md}"
    padding: "0 12px"
  table-header:
    backgroundColor: "{colors.surface-highest-light}"
    textColor: "{colors.ink-muted-light}"
  nav-item-active:
    backgroundColor: "{colors.slate-secondary-container}"
    textColor: "{colors.slate-on-secondary-container}"
    rounded: "{rounded.full}"
    height: "46px"
---

# Design System: GoAdmin (PtitGo Web Admin)

## Overview

**Creative North Star: "The Operational Clarity Ledger"**

GoAdmin là cổng điều hành nội bộ của hệ sinh thái lái xe hộ **PtitGo**, kết hợp thư viện **Ant Design 6** (cấu hình qua `ConfigProvider` `cssVar: { key: "md3" }` tại [src/theme/antdTheme.ts](file:///F:/goAdmin/src/theme/antdTheme.ts)) với hệ thống biến ngữ nghĩa **Material Design 3** tại [src/theme/theme.css](file:///F:/goAdmin/src/theme/theme.css) và lớp component rules tập trung tại [src/theme/components.css](file:///F:/goAdmin/src/theme/components.css). Giao diện ưu tiên khả năng quét dữ liệu nhanh, mật độ bảng cân đối, tách biệt rạch ròi các hành động tài chính/kiểm duyệt rủi ro và tính nhất quán tuyệt đối giữa Light Mode và Dark Mode.

**Key Characteristics:**
- Một nguồn token duy nhất trong `src/theme/theme.css`; mọi component và màn hình tiêu thụ biến `--md-sys-*`, `--app-color-*`, `--dashboard-*` thay vì màu hex rời rạc.
- Phân tầng độ sâu phẳng bằng chênh lệch tonal (`boxShadow: "none"` toàn hệ thống) thay vì bóng đổ nặng.
- Dữ liệu tài chính, số lượt, khoảng cách và tỷ lệ sử dụng `tabular-nums` và căn phải nhất quán trong bảng.
- Ngôn ngữ điều khiển Ant Design 6 đồng bộ Light/Dark/System qua `public/theme-init.js` trước khi React mount.

## Colors

Bảng màu GoAdmin giữ sắc đỏ mận **PtitGo Crimson** làm dấu ấn thương hiệu trên nền trung tính mát **Ice Slate Canvas** (Light) và **Rose-Tinted Obsidian** (Dark), tách riêng dải xanh dương cho trực quan hóa tài chính Dashboard.

### Primary
- **Deep PtitGo Crimson** (`#8f3d4b` sáng / `#ffb2bf` tối): Hành động chính (`Button primary`), liên kết điều hướng, tab đang chọn, bong bóng phản hồi CSKH (`--md-sys-color-primary`), đi kèm cặp mực tương phản `--md-sys-color-on-primary` (`#ffffff` sáng / `#561d2a` tối) và container nhẹ (`#ffdadf` sáng / `#723340` tối) cho bong bóng tài xế.

### Secondary
- **Graphite Slate** (`#444746` sáng / `#c4c7c5` tối): Văn bản phụ, nhãn cột bảng, mục điều hướng chưa chọn (`--md-sys-color-secondary`), cùng `--md-sys-color-secondary-container` (`#e3e9f0` sáng / `#333537` tối) làm nền pill menu đang chọn.

### Tertiary
- **Warm Bronze Accent** (`#795831` sáng / `#ecbf8f` tối): Vai trò bổ trợ trên container ấm (`#ffddb6` sáng / `#5f411f` tối) khi cần phân tách nhóm dữ liệu phụ ngoài trục primary/status.

### Neutral & Semantic Roles
- **Light Surfaces:** Canvas nền `#f0f4f9`, card/panel nổi `#ffffff`, header bảng và track điều khiển `#e9eef4`, chữ chính `#1f1f1f`, viền chức năng `#747775` (`outline`) và `#e3e3e3` (`outline-variant`).
- **Dark Surfaces:** Canvas nền pha 2% primary trên `#131314`, card/panel `#1e1f20` pha 4% primary, header bảng `#282a2c` pha 5% primary, chữ chính `#e3e3e3`, viền `#8e918f` / `#333537`.
- **Operational Status:** Thành công (`#326941` / `#b4f1bd`), cảnh báo (`#765a12` / `#ffdf93`), lỗi/hủy/âm tiền (`#ba1a1a` / `#ffdad6`), thông tin (`#245e91` / `#d0e4ff`).
- **Financial Viz (`--dashboard-*`):** Trục biểu đồ và khu vực Sức khỏe ví dùng `#2457c6` / `#8db8fa` / nền `#eef4ff` (Light) và `#5b8afa` / `#a9c9ff` / nền `#19263c` (Dark) để phân tách rõ biểu đồ doanh thu khỏi trạng thái lỗi/cảnh báo.

**The Single Source of Palette Rule.** Mọi mã màu thô chỉ được khai báo trong [src/theme/theme.css](file:///F:/goAdmin/src/theme/theme.css); không đặt màu hex hay gradient trang trí trực tiếp trong component hoặc trang con.

## Typography

**Display Font:** `"Google Sans Flex", "Segoe UI", system-ui, sans-serif`
**Body Font:** `"Google Sans Flex", "Segoe UI", system-ui, sans-serif`
**Label/Mono Font:** `"Google Sans Code", ui-monospace, monospace` (cho UUID hồ sơ eKYC, mã kỹ thuật và biển kiểm soát khi dùng `<code>`).

**Character:** Hệ chữ không chân hiện đại, dễ đọc tiếng Việt ở mật độ bảng và biểu mẫu hành chính, kết hợp biến thể số thẳng hàng (`font-variant-numeric: tabular-nums`) ở cột số và KPI.

### Hierarchy
- **Display** (`700`, `28px`, line-height `1.2`): Chỉ số tiền và KPI trọng tâm trên Dashboard (`.dashboard-metric-value`).
- **Headline** (`600`, `clamp(22px, 3vw, 28px)` ~ `24px`, line-height `1.25`, tracking `-0.02em`): Tiêu đề chính từng trang (`<Heading title=...>`).
- **Brand** (`700`, `22px`, line-height `1.15`): Tên thương hiệu sidebar `.sidebar-brand` và tiêu đề mức vừa trên mobile.
- **Section** (`600`, `18px`, line-height `1.35`): Biểu tượng/tiêu đề cụm nội dung nổi bật.
- **Title** (`500`, `16px`, line-height `1.4`): Tiêu đề `<Panel>`, `<Card>` và khối biểu đồ.
- **Subhead** (`600`, `15px`, line-height `1.4`): Tiêu đề phụ trong vùng chi tiết và thẻ con.
- **Body** (`400`, `14px`, line-height `1.5`): Nội dung bảng, mô tả `<Descriptions>`, đoạn hội thoại CSKH/chuyến đi.
- **Label** (`500`, `14px`, line-height `1.35`): Nhãn nút bấm, tab, item sidebar và nhãn `<FilterField>`.
- **Code / IDs** (`500`, `13px`, line-height `1.45`): Mã UUID hồ sơ eKYC trong bảng xét duyệt (`<code>`) và nút nhỏ `.ant-btn-sm`.
- **Caption** (`400`, `12px`, line-height `1.4`): Dòng phụ dưới tiêu đề chính bảng, chú thích KPI, timestamp hội thoại (`.ticket-meta`).
- **Overline** (`500`, `11px`, line-height `1.35`, tracking `0.06em`): Nhãn eyebrow và ghi chú chân sidebar (`.sidebar-bottom`).

**The Numeric Alignment Rule.** Mọi cột số lượng, tiền tệ VND (`money()`), tỷ lệ phần trăm và thời lượng trong bảng phải dùng `align: "right"` kèm `.ant-table-cell-align-right` (`font-variant-numeric: tabular-nums`) để các hàng đối chiếu thẳng cột dọc.

## Layout

Bố cục shell cố định giúp thao tác liên tục trên desktop mà không nhảy layout khi chuyển module:
- **Desktop Sidebar & Topbar:** Sidebar cố định rộng `232px` (`.desktop-sidebar`) với 9 module chính, chiều cao mục menu `46px` để hiển thị trọn vẹn không cuộn dọc tại viewport `1280×720` và `1024×768`; thanh Topbar cao cố định `64px` (`.topbar`) chứa breadcrumb trang con (`.topbar-breadcrumb`), bộ chuyển giao diện `<ThemeSwitcher />`, tên quản trị viên và nút Đăng xuất.
- **Filter-to-Table Separation:** Thanh lọc `.filters` (dùng `<FilterField>`) đứng bên ngoài phía trên `<Panel>` chứa `<DataTable>` hoặc `<Table>`, kèm đúng một nút `"Xóa bộ lọc"` trong `.filters`.
- **Responsive Breakpoints:** Dưới `992px`, sidebar chuyển thành `<Drawer>` trượt trái; dưới `576px` (`screens.xs`), `<DataTable>` tự chuyển sang danh sách thẻ tóm tắt di động (mobile cards) và không xuất hiện tràn ngang trang (`overflow-x`).

## Elevation & Depth

GoAdmin hoàn toàn **phẳng và phân lớp bằng tonal surface** (`boxShadow: "none"` trên mọi AntD token và component overrides trong [src/theme/components.css](file:///F:/goAdmin/src/theme/components.css)). Chiều sâu được tạo ra bởi sự chuyển bậc bề mặt:
1. Canvas chính (`--md-sys-color-surface`).
2. Vùng điều hướng & Drawer (`--md-sys-color-surface-container-low`).
3. Thẻ/Bảng/Panel (`--md-sys-color-surface-container`).
4. Khối lồng có phân tách chức năng bên trong Drawer/Panel như `.document-card`, `.rating-item`, `.verification-decision-box`, nền label `<Descriptions bordered>` (`--md-sys-color-surface-container-low` / `-high` kết hợp viền mảnh 1px `--md-sys-color-outline-variant`).
5. Lớp phủ Modal (`--md-sys-color-surface-variant`) cùng nền scrim tối 32%.

**The Flat-Tonal Surface Rule.** Không thêm `box-shadow` trang trí hoặc lồng `<Card>` mặc định bên trong `<Card>`/`<Panel>`; dùng khối tonal nội tuyến với viền 1px `--md-sys-color-outline-variant` khi cần phân tách cụm đánh giá hay giấy tờ.

## Shapes

- **Panels, Inputs & Tables (`12px` / `--md-sys-shape-corner-md`):** Bề mặt bảng, khung bộ lọc, ô nhập liệu và container panel.
- **Large Popovers & Verification Groups (`16px` / `--md-sys-shape-corner-lg`):** Menu thả xuống, bảng chọn ngày và vùng ảnh eKYC.
- **Modals (`28px` / `--md-sys-shape-corner-xl`):** Hộp thoại xác nhận hành động tài chính, sửa bảng giá và chi tiết chiến dịch.
- **Full-Pill Controls (`9999px` / `--md-sys-shape-corner-full`):** Tất cả nút bấm (`.ant-btn`), mục menu đang chọn, `<ThemeSwitcher />` và thẻ trạng thái (`<Tag>`).

## Components

### Buttons
- **Shape & Height:** Pill `9999px`, chiều cao chuẩn `40px` (`padding-inline: 24px`); biến thể nhỏ trong bảng (`.ant-btn-sm`) dùng `32px` trên desktop (`padding-inline: 14px`) và tăng lên `40px` trên màn cảm ứng `@media (pointer: coarse)` để tránh rớt dòng trong hàng bảng dày.
- **Primary:** Nền `--md-sys-color-primary`, chữ `--md-sys-color-on-primary`, không viền.
- **Secondary / Default & Danger:** Default viền `1px solid --md-sys-color-outline` chữ `--md-sys-color-primary`; hành động hủy/từ chối/thu hồi dùng `danger` với `--md-sys-color-error`.

### Chips & Status Tags
- **Style:** Pill `9999px`, font `12px–13px` trung tính, màu nền `-container` ghép chữ `-on-*-container` cho cả Light và Dark Mode (`green`, `gold`, `red`, `blue`, `purple`, `cyan`, `default`), luôn kèm nhãn chữ tiếng Việt rõ nghĩa.

### Cards / Containers
- **Panel & Stat Cards:** Bo `12px`, nền `--md-sys-color-surface-container`, padding đầu/thân `24px`, không viền trang trí và không bóng đổ.
- **Nested Tonal Sub-cards:** `.document-card` (trong Drawer/Tab giấy tờ) và `.rating-item` (trong kiểm duyệt đánh giá) dùng `1px solid --md-sys-color-outline-variant` + bo `12px`, không dùng `opacity` để làm mờ văn bản phụ.

### Inputs / Fields
- **Style:** Bo `12px`, viền `--md-sys-color-outline`, nền `--md-sys-color-surface-container-low`, bộ lọc dùng `<FilterField>` cao `40px`, form đăng nhập/chính cao `56px` không shadow focus (`box-shadow: none`). Ô `<Input.Search>` giữ `min-width: 240px`.
- **Labels & Focus:** Mọi control không nằm trong `<Form.Item>` có nhãn đều dùng `<label htmlFor>` hoặc `aria-label` rõ ràng; `:focus-visible` hiển thị viền focus `2px solid --md-sys-color-primary`.

### Navigation
- **Sidebar & Drawer:** Nền `--md-sys-color-surface-container-low`, viền phải `1px solid --md-sys-color-outline-variant`, mục đang chọn pill `9999px` nền `--md-sys-color-secondary-container`.
- **Breadcrumb & 404:** Đường dẫn con hiển thị breadcrumb dẫn về module gốc ở Topbar; route không tồn tại hiển thị AntD `<Result status="404">` kèm CTA về `/dashboard`.

## Do's and Don'ts

### Do:
- **Do** sử dụng đúng semantic tokens (`--md-sys-color-*`, `--dashboard-*`) và formatter chuẩn (`money()`, `date()`, `dateFilter()`, `label()`) trên mọi màn hình.
- **Do** giữ nút hành động hủy/từ chối/thu hồi ở trạng thái `danger` và khóa thao tác đóng Modal/Drawer hoặc bấm gửi lại trong khi mutation `isPending`.
- **Do** giữ chuyển động tôn trọng `@media (prefers-reduced-motion: reduce)` qua quy tắc tập trung trong `src/theme/components.css`.

### Don't:
- **Don't** gắn `onReset` tạo nút `"Xóa bộ lọc"` trùng lặp bên trong `<DataTable>` trên các trang đã có sẵn `"Xóa bộ lọc"` trong thanh `.filters`.
- **Don't** tự tạo shadow nổi, gradient trang trí, `<Card>` lồng trong `<Card>`, hoặc màu hex cứng ngoài `src/theme/theme.css`.
- **Don't** che hoặc bỏ qua dấu hiệu sai lệch bản nộp eKYC, lợi nhuận âm (`grossProfit < 0`), hay thiếu dữ liệu bằng giá trị `0 đ` giả tạo.
