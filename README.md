# PTITgo Admin

Web quản trị tiếng Việt cho dịch vụ lái hộ. Ứng dụng React/TypeScript chạy độc lập, dùng Vite, Ant Design, React Router, TanStack Query và Firebase Web SDK. Màu chủ đạo `#800000`.

## Chạy trên máy mới

Yêu cầu Node.js `22.12+` (khuyến nghị Node.js 24), pnpm `10.34.7`, và backend PTITgo có thể truy cập từ máy đang mở trình duyệt.

```powershell
git clone https://github.com/LoocjTheConqueror/PTITgo_admin.git
cd PTITgo_admin
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
```

Điền `.env.local` bằng Firebase **Web config** của cùng project với backend. Team nhận cấu hình local riêng; repo chỉ có tệp mẫu.

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

- `VITE_API_BASE_URL` là origin backend, **không thêm `/api`**. Nếu backend nằm trên máy khác, thay `localhost` bằng IP/tên miền của máy đó; ví dụ `http://192.168.1.10:8080`.
- Các biến `VITE_FIREBASE_*` lấy từ Web app đã đăng ký trong Firebase. Dùng Web App ID, không dùng Android App ID hoặc Google OAuth Client ID.
- Không đặt mật khẩu, service account hoặc private key vào biến `VITE_*`. Firebase Web config được nhúng vào trình duyệt khi build.
- `.env.local` được Git bỏ qua. Khởi động lại web sau khi đổi env; khi thay env của bản production cần build lại.

Sau khi cấu hình:

```powershell
pnpm dev
```

Mở [http://localhost:5173](http://localhost:5173). Nếu cổng đã được dùng, Vite sẽ thông báo cổng khác; origin thực tế cần được backend cho phép qua CORS.

## Backend và quyền đăng nhập

Repo này chứa frontend. Backend, PostgreSQL, Redis và cấu hình dịch vụ liên quan được vận hành riêng. Máy chạy frontend không cần Docker nếu đã có backend dùng chung.

1. Bật Firebase Authentication Email/Password.
2. Dùng Firebase user đã được backend cấp quyền `ADMIN`, trạng thái `ACTIVE`. Web không tự đăng ký hoặc tự cấp quyền quản trị.
3. Nếu cần cấp tài khoản đầu tiên, cấu hình `BOOTSTRAP_ADMIN_FIREBASE_UID`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_FULL_NAME` ở backend rồi khởi động lại backend. UID chưa được liên kết với customer hoặc driver.
4. Backend mặc định cho phép `http://localhost:5173`. Nếu web dùng origin khác, thêm origin đó vào `APP_CORS_ALLOWED_ORIGINS` của backend.

Không cần tạo lại admin chỉ vì chuyển frontend sang máy mới khi vẫn dùng cùng backend và Firebase project.

Phiên Firebase chỉ giữ trong tab hiện tại. Đăng nhập gọi `/api/auth/admin/login`; khôi phục phiên kiểm tra `/api/auth/me`. Đăng xuất xóa phiên Firebase và cache frontend kể cả khi API logout thất bại.

## Chức năng

- Tổng quan: số đếm vận hành từ `totalElements`, các danh sách đã lọc.
- Chuyến đi: danh sách/chi tiết, lịch sử trạng thái, biên bản bàn giao, chat chỉ đọc, gán tài xế và hủy chuyến.
- Tài xế: tìm kiếm/lọc, hồ sơ, duyệt giấy tờ, xác minh kỹ năng, duyệt tài khoản và ép offline.
- Hàng chờ duyệt gom theo mã tài xế: mỗi tài xế một dòng, tổng kết quả và phân trang tính theo hồ sơ. Cửa sổ “Xem và duyệt” có toàn bộ giấy tờ hiện hành, xác minh kỹ năng và quyết định tài khoản. Biểu mẫu từng giấy tờ mở ngay trong cửa sổ; quyết định tài khoản luôn nằm ở phần dưới cố định. Các nút duyệt trên trang chi tiết tài xế cũng mở cùng cửa sổ này.
- Duyệt giấy tờ không tự động duyệt tài khoản. Hồ sơ có giấy tờ đã nộp và tài khoản còn `PENDING` vẫn xuất hiện trong hàng chờ, kể cả khi đã xét duyệt hết giấy tờ. Backend quyết định giấy tờ nào bắt buộc; nếu chưa đủ, lỗi hiển thị ngay cạnh quyết định tài khoản. Khi đang lưu, cửa sổ khóa các thao tác ghi khác và nút đóng để tránh gửi trùng.
- Khách hàng: hồ sơ, trạng thái, đánh dấu, lịch sử chuyến và giao dịch ví.
- Bảng giá: tạo/sửa, kích hoạt, tắt và xác nhận riêng khi tắt cưỡng chế bảng giá cuối cùng.
- Kết nối 23 endpoint `/api/admin`, API tìm tài xế gần vị trí và các API xác thực.

Bộ lọc, phân trang và tab được lưu trên URL. Dashboard/chuyến cập nhật mỗi 30 giây, chat mỗi 10 giây khi mở; dừng polling khi tab ẩn. Tiền hiển thị VND, thời gian có múi giờ hiển thị theo Việt Nam. Giấy tờ chỉ xuất hiện trong hàng chờ khi đã được gửi thật lên backend.

API hàng chờ hiện phân trang theo giấy tờ. Frontend đọc hết các trang khớp bộ lọc (tối đa 100 giấy tờ mỗi lần), rồi gom và phân trang theo tài xế để một hồ sơ không bị tách qua nhiều trang. Bộ lọc `PENDING` bổ sung các tài khoản chờ duyệt đã nộp giấy tờ; tối đa bốn yêu cầu đọc chi tiết đồng thời. Khi hàng chờ lớn, nên bổ sung API hồ sơ duyệt theo tài xế tại backend để giảm số lần tải. Số “Giấy tờ chờ duyệt” ở tổng quan vẫn đếm giấy tờ.

Chưa bao gồm báo cáo doanh thu, bản đồ, quản lý voucher, quản lý tài khoản quản trị hoặc hosting.

## Kiểm tra và build

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
```

Bộ kiểm thử tự động kiểm tra đăng nhập, lớp API và các luồng quản trị bằng dữ liệu giả tại ranh giới Firebase/backend. Ứng dụng bình thường chỉ gọi API thật. Kiểm thử nghiệp vụ thực tế cần backend, dữ liệu và tài khoản phù hợp.

Bản build nằm trong `dist/`. Khi triển khai hosting, dùng HTTPS, cấu hình CORS đúng origin và phục vụ `index.html` cho các đường dẫn SPA như `/rides/123`. `pnpm preview` dùng để xem bản build local.


## UI/UX và giao diện sáng/tối

Ứng dụng hỗ trợ Sáng / Tối / Theo hệ thống tại thanh tài khoản và trang đăng nhập. Tùy chọn được lưu trên trình duyệt.

Tìm chuyến theo tên/SĐT và ngày tạo cần backend có endpoint GET /api/admin/rides/filter-capabilities. Checklist duyệt dùng required_document_types từ chi tiết tài xế; backend vẫn kiểm tra điều kiện khi xác nhận.

Kế hoạch, hợp đồng và kết quả kiểm chứng: [tasks/plan.md](tasks/plan.md), [tasks/todo.md](tasks/todo.md), [tasks/implementation.md](tasks/implementation.md).


### Duyệt rút tiền tài xế

Mở **Yêu cầu rút tiền** (`/withdrawals`). Trang mặc định hiển thị các yêu cầu
PENDING, hỗ trợ lọc trạng thái và phân trang 20/50/100 bản ghi.

- Đối chiếu tài xế, ngân hàng, số tài khoản và số tiền. Thiếu thông tin ngân hàng
  thì nút Duyệt bị khóa; tài xế bổ sung trong app tại Hồ sơ → Thông tin cá nhân.
- Duyệt: chuyển khoản bằng ứng dụng ngân hàng, sau đó xác nhận đã chuyển tiền
  trong hộp thoại. Trang quản trị ghi nhận kết quả qua API, không tự chuyển tiền.
- Từ chối: nhập lý do (1–500 ký tự). Backend hoàn số tiền giữ về ví tiền mặt,
  lưu trạng thái và gửi thông báo cho tài xế.
- API: `GET /api/admin/withdrawals?page=0&size=20&status=PENDING` và
  `POST /api/admin/withdrawals/{id}/review` với `action: APPROVE | REJECT`.
  Khi từ chối gửi thêm `rejectReason`.

Kiểm thử trên Node 26: `NODE_OPTIONS=--no-experimental-webstorage npm test -- --maxWorkers=2`
để sử dụng localStorage của jsdom thay vì Web Storage thực nghiệm của Node.


### Trợ giúp / khiếu nại từ hai app

Trang `/support` tiếp nhận chung CUSTOMER và DRIVER qua `GET /api/admin/support/tickets`.
Bộ lọc trạng thái và phân trang 20 bản ghi áp dụng ở server. Trang danh sách và
chi tiết tự làm mới mỗi 15 giây; hai app tải phản hồi mỗi 30 giây hoặc khi mở lại
màn Trợ giúp. Trạng thái: OPEN, IN_PROGRESS, RESOLVED; đóng yêu cầu bắt buộc phản hồi.

Khi lưu, Admin gửi `expectedUpdatedAt` cùng `{status, response}`. Backend khóa
bản ghi và từ chối bản cũ (409). Giao diện giữ bản nháp nếu có cập nhật từ admin
khác; chọn **Tải phản hồi mới nhất** và xác nhận trước khi thay nội dung đang nhập.
Cần triển khai backend cùng thay đổi này; không cần migration mới.
