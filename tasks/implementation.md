# Kết quả triển khai UI/UX và dark mode

Ngày: 05/11/2026. Phạm vi: `PTITgo_admin` và các API admin tương ứng trong `backend` cùng workspace.

## Thay đổi đã thực hiện

- Sáng/Tối/Theo hệ thống, lưu lựa chọn trên trình duyệt, khởi tạo nền sớm, không remount biểu mẫu khi chuyển theme.
- Bộ màu semantic sáng/tối, sidebar/topbar/panel/bảng/biểu mẫu đồng nhất; giữ đỏ đô, tăng độ rõ của chữ, trạng thái và focus. Modal/Drawer/dropdown theo cùng theme.
- Mở đúng tài xế từ Tổng quan bằng `driverId` trên URL; khôi phục khi reload/Back/Forward; phân biệt số giấy tờ và số tài khoản chờ quyết định.
- Tìm hàng chờ theo tên/SĐT/mã, nhãn lọc thường trực, nút đặt lại giữ cỡ trang, giữ tài khoản chưa ra quyết định trong hàng chờ.
- Checklist giấy tờ bắt buộc theo cấu hình backend; chặn duyệt khi biết còn thiếu và giải thích tại chỗ. Quy tắc duyệt tài khoản vẫn do server quyết định.
- Nhãn duyệt/từ chối cụ thể; “Lưu và tiếp tục” chỉ chuyển sau thành công; giữ lý do/mục đang xem khi lỗi. Cảnh báo đóng/chuyển giấy tờ/Back/rời trang khi chưa lưu.
- Tìm chuyến theo tên/SĐT khách hoặc tài xế, lọc ngày tạo theo giờ Việt Nam, lọc nhanh và lưu URL. Server lọc trước phân trang/count; phát hiện khả năng API để tránh bỏ qua tiêu chí trên server cũ.
- Link khách/tài xế giữ đường quay lại; kiểm tra nguồn quay lại là đường dẫn nội bộ; khôi phục cuộn theo route/query.
- Cột bảng phù hợp, tiền căn phải, danh sách thẻ trên điện thoại. Bảng giá nhóm trường và định dạng số; ô chưa nhập không hiển thị thành 0.
- Tỷ lệ hiển thị phần trăm từ quy ước 0–1 của fixture hiện tại; số 0 khác dữ liệu thiếu. Cần đối chiếu thêm dữ liệu môi trường vận hành.
- Thông báo nêu hành động/đối tượng; nút chỉ reset lỗi đổi thành “Đóng thông báo”; có thời điểm cập nhật, phân biệt chưa tải/không có kết quả.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Baseline frontend | 49 test đạt; build đạt; lint vướng preview tạm, đã chuyển bản preview cũ ra ngoài source trước khi tiếp tục |
| Frontend cuối cùng | 64/64 test đạt trong 7 file; log tại `.qa/uiux-final-tests.log` |
| TypeScript / ESLint / production build | Cả ba đạt; build còn cảnh báo kích thước chunk đã nêu bên dưới |
| Backend: điều kiện duyệt và bộ lọc | 4 test mới đạt, gồm truy vấn trên H2 với entity thật |
| Backend toàn bộ | 31 test: 29 đạt, 1 bỏ qua theo điều kiện môi trường đã có, 1 lỗi `contextLoads` do PostgreSQL localhost:5432 từ chối kết nối |
| Browser desktop | 10 route × 2 theme ở 1440 px; heading và theme đúng, có ảnh bằng dữ liệu mẫu |
| Browser responsive | 40 lượt: 10 route ở 320/768/1024 px trong tối, thêm 10 route sáng ở 320 px; không tràn ngang toàn trang |
| Browser popup | Drawer hồ sơ và modal bảng giá × 2 theme × 2 kích thước 320/1440 px; không tràn ngang |
| Luồng hồ sơ | Back → ở lại giữ lý do; lưu bằng bàn phím mở giấy tờ tiếp theo, không tự duyệt mục tiếp theo |
| Theme / bàn phím | Đổi theme giữ nội dung email thử; reload giữ dark mode; skip link chuyển focus tới nội dung chính |
| Console sau sửa | Không có warning/error mới; cảnh báo RangePicker disabled + value rỗng được sửa bằng `allowEmpty` |
| Độ nhạy test | Cố ý đổi biên ngày để từ chối cùng ngày làm test thất bại; đã khôi phục mã và xác nhận đạt lại |

Lệnh frontend: `pnpm typecheck`, `pnpm lint`, `pnpm exec vitest run --configLoader runner --maxWorkers=2 --reporter=dot`, `pnpm build`.

Lệnh backend từ `backend`: `.\gradlew.bat test --tests '*Admin*Tests' --offline`; đã thử `.\gradlew.bat test --offline` để ghi nhận giới hạn DB thật. Không xóa hoặc bỏ qua test lỗi để làm xanh bộ kiểm tra.

Bằng chứng: `.qa/uiux-screenshots/browser-checks.json` và các ảnh trong cùng thư mục. Tổng 68 tổ hợp màn hình/theme/kích thước; ảnh dùng dữ liệu mẫu, không phải dữ liệu vận hành. Các ảnh modal bảng giá được chụp trước sửa cuối về ô số trống; sửa đổi này được chứng minh bằng test render riêng và test tạo/sửa bảng giá.

Cặp token màu đã đo: chữ chính sáng 14.67:1; chữ phụ nền sáng 5.24:1; chữ chính tối 14.46:1; chữ phụ nền tối 6.91:1; chữ trắng/nút primary tối 4.92:1; biên điều khiển sáng/tối 3.15:1 / 3.61:1. Đây là đo các cặp màu nền tảng, chưa phải chứng nhận toàn bộ WCAG.

## Cần nghiệm thu tiếp trên môi trường thật

1. Chạy PostgreSQL và các dịch vụ/cấu hình backend, chạy lại `contextLoads` và kiểm tra frontend → backend thật. Fixture browser và H2 không thay kiểm chứng môi trường vận hành.
2. Cập nhật backend cùng frontend để cung cấp tìm chuyến và `required_document_types`; kiểm tra quyền admin và nghiệp vụ trên dữ liệu test của môi trường đó.
3. Đo hàng chờ lớn và truy vấn trên PostgreSQL với dữ liệu đại diện. Hàng chờ vẫn tải đầy đủ trang giấy tờ rồi gom tài xế; chưa chuyển sang endpoint phân trang theo hồ sơ.
4. Đối chiếu đơn vị tỷ lệ trên dữ liệu thật trước phát hành. Fixture frontend dùng `0.25 = 25%`.
5. Kiểm tra zoom trình duyệt 200%, screen reader và ảnh giấy tờ thực đã ẩn danh. Phím zoom trong browser kiểm thử không đổi mức phóng to, nên chưa đánh dấu đạt.
6. Review trực quan cuối các màn hình ít sử dụng và khôi phục cuộn trên luồng thực tế. Screenshot/geometry không thay mọi thao tác thủ công.

Build vẫn cảnh báo chunk UI lớn hơn 1100 kB; cảnh báo có ở baseline và ngưỡng không được nâng. Capability mới làm tăng bundle; cần đo tải thực khi chuẩn bị phát hành.

## Bảo toàn và bàn giao

- Snapshot source ban đầu và patch thay đổi có sẵn nằm tại `.local-backups/admin-uiux-baseline-20261105` ở gốc workspace.
- Ở lượt triển khai ban đầu, các thay đổi được giữ trong working tree để review và chưa push/triển khai production. Sau đó người dùng yêu cầu đưa toàn bộ bản admin mới lên repo frontend `gialochoang0306/goAdmin`.
- Preview dùng config riêng `.qa/uiux-preview/config.mjs`, alias auth và API trong bộ nhớ; không nằm trong production entry, không ghi dữ liệu thật.
- Hợp đồng theme/metadata/bộ lọc ở [plan.md](plan.md); trạng thái đầu việc ở [todo.md](todo.md).

## Đích bàn giao frontend

Repository frontend: https://github.com/gialochoang0306/goAdmin, nhánh `main`, thư mục gốc là ứng dụng admin. Bao gồm UI/UX mới, dark mode và logo PtitGo gốc. Các file `.env.local`, `.env.vercel.local`, `.qa`, `node_modules` và `dist` không thuộc bản bàn giao.

Các thay đổi Kotlin/backend vẫn nằm trong thư mục `backend` của workspace, không đưa vào repo frontend này. Cần cập nhật backend riêng để bật tìm chuyến nâng cao và checklist điều kiện duyệt đầy đủ; frontend có kiểm tra khả năng tương thích với backend cũ.
