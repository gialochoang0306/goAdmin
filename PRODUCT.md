# Product — GoAdmin (PtitGo Web Admin Portal)

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

GoAdmin là cổng điều hành nội bộ của hệ sinh thái lái xe hộ **PtitGo**, phục vụ đội ngũ vận hành (Operations), kiểm duyệt viên eKYC (KYC Reviewers), chăm sóc khách hàng (CSKH) và đối soát tài chính (Finance Admins):

1. **Điều hành vận hành (Operations Admin):** Giám sát KPI theo thời gian thực trên Tổng quan, theo dõi và can thiệp chuyến đi đang chạy/chưa có tài xế (gán tài xế, gán lại, hủy chuyến có lý do, xem biên bản bàn giao xe & hội thoại trong chuyến), khóa/mở tài khoản khách hàng hoặc tài xế, ép tài xế offline khi vi phạm.
2. **Kiểm duyệt viên eKYC (Verification Reviewer):** Xét duyệt hồ sơ đăng ký tài xế (CCCD mặt trước/sau, GPLX, ảnh chân dung, đối chiếu khuôn mặt, dữ liệu QR/OCR, kỹ năng lái xe hạng xe, chính sách khóa danh tính và lịch sử revision).
3. **Nhân viên CSKH (Support Agent):** Tiếp nhận và xử lý yêu cầu hỗ trợ hai chiều (`HT-<id>`), phản hồi kèm ảnh đính kèm và cập nhật trạng thái xử lý gắn liền chuyến đi liên quan.
4. **Quản trị tài chính & giá cước (Finance & Pricing Admin):** Duyệt hoặc từ chối yêu cầu rút tiền ví tiền mặt tài xế, kiểm tra ngân hàng nhận tiền, quản lý bảng giá theo loại xe (`Ô tô`, `Xe máy`), quản lý quỹ tổng khuyến mãi, cấp phát chiến dịch/voucher và kiểm duyệt đánh giá hai chiều sau chuyến đi.

## Product Purpose

Cung cấp bảng điều khiển quản trị tập trung, minh bạch và an toàn nghiệp vụ cho toàn bộ vòng đời dịch vụ lái xe hộ PtitGo: từ xét duyệt tài xế hợp pháp, điều phối chuyến đi, giải quyết khiếu nại đến đối soát dòng tiền nền tảng — giảm sai sót thao tác tài chính và đảm bảo dữ liệu một nguồn sự thật từ backend Spring Boot.

## Positioning & Brand Alignment

GoAdmin cùng hệ sinh thái **PtitGo** với hai ứng dụng di động khách hàng và tài xế (`F:\datxe_rn`), giữ nhận diện crimson/rose thương hiệu PtitGo (`#8F3D4B` sáng / `#FFB2BF` tối) và triết lý Material Design 3 phẳng, nhưng tối ưu hoàn toàn cho desktop web admin:

- **Tốc độ thao tác & mật độ thông tin hợp lý:** Bảng dữ liệu rõ ràng, số tiền/số lượng căn phải với `tabular-nums`, bộ lọc tách bạch khỏi bảng kết quả, hỗ trợ mở nhanh chi tiết bằng mã.
- **Giảm sai sót nghiệp vụ & an toàn tài chính:** Mọi hành động nhạy cảm (duyệt/từ chối rút tiền, khóa tài khoản, dừng chiến dịch voucher, ép offline tài xế, duyệt/từ chối hồ sơ xác minh, hủy chuyến) đều yêu cầu xác nhận rõ trạng thái, lý do bắt buộc hoặc guardrail chống bấm lặp (`pending` / `disabled`), đồng thời giữ modal mở khi đang xử lý.
- **Minh bạch số liệu tài chính:** Phân biệt rạch ròi giữa **GMV (Tổng giá trị giao dịch)**, **Doanh thu nền tảng (chiết khấu)**, **Chi phí khuyến mãi (quỹ voucher đã trừ)**, **Lợi nhuận gộp (doanh thu trừ voucher)** và **Tổng nghĩa vụ ví đang giữ hộ**.
- **Bảo mật dữ liệu cá nhân & eKYC:** Ảnh CCCD/GPLX/selfie chỉ nạp theo phiên xác thực ngắn hạn (`authFetch`), không công khai URL ảnh nhạy cảm ra ngoài, không tự ý bỏ qua khóa danh tính (Identity Lock).

## Operating Context

- **Công nghệ nền tảng:** React 19, TypeScript, Vite, Ant Design 6, React Query v5, Firebase Authentication, pnpm (desktop & responsive web admin dashboard).
- **Môi trường sử dụng:** Văn phòng điều hành trên màn hình desktop (`1280×720`, `1440×900`, zoom trình duyệt `200%`), kiêm hỗ trợ kiểm tra nhanh trên tablet/mobile (`375×812`) qua sidebar Drawer và card danh sách đáp ứng (`DataTable` responsive cards).
- **Ngôn ngữ & định dạng:** Tiếng Việt làm ngôn ngữ giao diện (`antd/locale/vi_VN`), đơn vị tiền tệ Việt Nam Đồng (`đ`, định dạng `vi-VN`), ngày giờ theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).
- **Tích hợp & ranh giới kỹ thuật:** Xác thực admin qua Firebase Authentication + xác minh quyền admin qua `GET /api/admin/auth/me`; làm mới dashboard định kỳ 30 giây; hỗ trợ chế độ Sáng / Tối / Theo hệ thống lưu trữ đồng bộ trước khi render (`public/theme-init.js`).

## Product Principles

1. **Một nguồn sự thật, không hiển thị thành công giả:** Luôn tôn trọng trạng thái thực từ server (đang tải, rỗng, lỗi kèm nút thử lại, khóa nút khi mutation đang chạy); tuyệt đối không cập nhật lạc quan giả cho lệnh tiền hay duyệt hồ sơ.
2. **Phân cấp thị giác rõ ràng cho đọc dữ liệu:** Số liệu KPI dùng chữ đậm kích thước lớn (`tabular-nums`), phân biệt giá trị dương/âm (`data-tone="negative"` cho lợi nhuận gộp âm), tách riêng vùng lọc và vùng bảng dữ liệu.
3. **Trung thực với trạng thái & ngữ cảnh đối chiếu:** Trạng thái được diễn giải bằng cả nhãn chữ tiếng Việt và mã màu ngữ nghĩa; trên màn duyệt eKYC luôn chỉ rõ tài xế, bản nộp (revision) đang xem, cảnh báo khi xem bản cũ hoặc có sai lệch QR/OCR.
4. **Hợp tác trên nền Ant Design + MD3:** Mọi tinh chỉnh giao diện đều đi qua semantic CSS tokens (`src/theme/theme.css`) và `ConfigProvider` (`src/theme/antdTheme.ts`), tránh viết style rời rạc từng trang gây đứt gãy Light/Dark Mode.

