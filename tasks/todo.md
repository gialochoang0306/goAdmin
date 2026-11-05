# Checklist triển khai UI/UX và dark mode

Kế hoạch gốc: [plan.md](plan.md). Ngày lập: 05/11/2026. Mã nguồn đã triển khai; các ô còn trống là nghiệm thu môi trường thật hoặc kiểm tra thủ công chưa đủ bằng chứng. Xem [báo cáo triển khai](implementation.md).

Quy ước: S ≈ 1–2 file, M ≈ 3–5 file; các file dưới đây là dự kiến. Nếu một task vượt phạm vi này, tách task trước khi viết code. Sau thay đổi hành vi, chạy test tập trung tương ứng; sau mỗi checkpoint chạy kiểm tra tổng thể trong plan. Chỉ đánh dấu khi có bằng chứng đạt.

## A. Xác minh và sửa luồng truy cập

### T01 — Ghi nhận baseline và hợp đồng thực tế · M

- [ ] Chụp/kiểm tra màn hình hiện tại trên laptop và điện thoại bằng dữ liệu test; phân biệt lỗi tái hiện với nghi vấn từ code.
- [ ] Xác nhận môi trường API, đơn vị tỷ lệ, metadata giấy tờ và quy tắc thời gian; ghi nhận kết quả vào plan.
- [x] Ghi lại trạng thái kiểm tra hiện có và thay đổi chưa commit để bảo toàn baseline.

Phụ thuộc: không. File: `tasks/plan.md`, bằng chứng kiểm tra trong `.qa/` (không đưa ảnh dữ liệu thật vào Git).
Kiểm chứng: hai luồng bắt buộc trong plan; `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; ghi rõ lỗi có sẵn nếu có.

### T02 — Mở đúng hồ sơ từ Tổng quan · M

- [x] “Xem hồ sơ” mở đúng tài xế qua URL; reload/Back/Forward hoạt động, đóng drawer giữ bộ lọc.
- [x] Hồ sơ không còn khả dụng có thông báo đúng; không chuyển sang người khác.
- [x] Nhãn số đếm phân biệt giấy tờ và hồ sơ; không đưa ra số đếm hồ sơ thiếu dữ liệu.

Phụ thuộc: T01. File: `src/pages/Dashboard.tsx`, `src/pages/Drivers.tsx`, `src/test/documents.test.tsx`, `src/test/workflows.test.tsx`.
Kiểm chứng: test deep link bằng `pnpm exec vitest run --configLoader runner src/test/documents.test.tsx src/test/workflows.test.tsx`; kiểm tra URL trên browser.

### T03 — Giữ ngữ cảnh khi mở khách/tài xế từ chuyến · M

- [x] Quay lại đúng màn hình nguồn, gồm bộ lọc, tab và phân trang; nhãn quay lại phản ánh nguồn.
- [x] Mở thẳng chi tiết vẫn có đường quay lại hợp lý.
- [ ] Chỉ dùng đường dẫn nội bộ hợp lệ để quay lại; kiểm tra cách khôi phục vị trí cuộn.

Phụ thuộc: T01. File: `src/pages/Rides.tsx`, `src/pages/Drivers.tsx`, `src/pages/Customers.tsx`, helper điều hướng nếu cần, `src/test/workflows.test.tsx`.
Kiểm chứng: test và thao tác chuyến → khách/tài xế → quay lại; thử truy cập trực tiếp không có state nguồn.

### Checkpoint A

- [x] Hai luồng truy cập đạt trên browser thật; bộ kiểm tra liên quan không phát sinh hồi quy.

## B. Nền thiết kế và theme

### T04 — Chuẩn hóa token thiết kế · M

- [x] Có token semantic cho nền/bề mặt/chữ/viền/thương hiệu/focus/trạng thái sáng và tối, ánh xạ Ant Design và CSS nhất quán.
- [x] Chốt thang chữ/khoảng cách/mật độ theo ba màn hình mẫu trong plan, giữ nhận diện đỏ đô.
- [x] Ghi các màu/override còn cần chuyển đổi; không dùng một màu nguy hiểm thay cho mọi trạng thái thương hiệu.

Phụ thuộc: T01. File: `src/theme/tokens.ts` (mới), `src/styles.css`, `src/main.tsx`, `tasks/plan.md`.
Kiểm chứng: đo tương phản các cặp màu chính; kiểm tra mẫu component và `pnpm typecheck`, `pnpm build`.

### T05 — Cơ chế theme và khởi tạo ban đầu · M

- [x] Ba lựa chọn sáng/tối/hệ thống được lưu; hệ thống chỉ chi phối khi đang chọn Theo hệ thống.
- [x] Khởi tạo không chớp nền sai; giá trị hỏng/bộ nhớ bị chặn không làm ứng dụng lỗi.
- [x] Chuyển theme giữ nguyên route, dữ liệu form và trạng thái cửa sổ đang mở.

Phụ thuộc: T04. File: `src/theme/ThemeProvider.tsx` (mới), `src/main.tsx`, `index.html`, module khởi tạo theme nếu cần, `src/test/theme.test.tsx` (mới).
Kiểm chứng: test preference/media change/storage lỗi; reload với tải chậm trên browser, kiểm tra thứ tự render và CSP nếu áp dụng.

### T06 — Điều khiển chọn giao diện · M

- [x] Topbar và trang đăng nhập có lựa chọn Sáng/Tối/Theo hệ thống, hiển thị đúng chế độ chọn.
- [x] Dùng được bằng bàn phím và có tên truy cập rõ; không chỉ dùng icon khó đoán.
- [x] Ở 320 px không che nút điều hướng hoặc thao tác tài khoản.

Phụ thuộc: T05. File: `src/components/ThemeSwitcher.tsx` (mới), `src/App.tsx`, `src/styles.css`, `src/test/theme.test.tsx`.
Kiểm chứng: test lựa chọn và lưu trạng thái; thao tác bàn phím trên login/topbar ở sáng/tối.

### Checkpoint B1

- [x] Theme hoạt động xuyên route và đăng nhập; kiểm tra tổng thể frontend đạt; nền/chữ chính đủ tương phản.

### T07 — Cải thiện shell và component chung · M

- [x] Sidebar/topbar/heading/panel/status thống nhất thứ bậc, khoảng cách và trạng thái hover/focus/selected.
- [x] Chuyển màu gán trực tiếp còn lại của shell, chat, giấy tờ, login và các component chung sang token phù hợp.
- [x] Modal/Drawer/dropdown/toast/preview đồng bộ theme; ảnh giữ màu gốc, reduced motion được tôn trọng.

Phụ thuộc: T04–T06. File: `src/App.tsx`, `src/components/common.tsx`, `src/styles.css`, `src/theme/tokens.ts`.
Kiểm chứng: ảnh sáng/tối các màn hình mẫu, kiểm tra portal/focus/ảnh gốc; không cần test snapshot khoảng cách.

## C. Lọc và duyệt hồ sơ

### T08 — Nhãn bộ lọc và đặt lại ở tài xế/khách hàng · M

- [x] Nhãn lọc luôn hiện; giá trị “Có/Không” không làm mất nghĩa “Đánh dấu”.
- [x] “Xóa bộ lọc” trả về mặc định, giữ cỡ trang và đưa về trang đầu; URL và ô tìm đồng bộ.
- [x] Kết quả rỗng do lọc có giải thích và đường xóa điều kiện.

Phụ thuộc: T07. File: `src/components/FilterBar.tsx` (mới), `src/pages/Drivers.tsx`, `src/pages/Customers.tsx`, `src/styles.css`, `src/test/workflows.test.tsx`.
Kiểm chứng: test lọc/đặt lại/Back/Forward; thử nhãn dài ở 320 và 1024 px.

### T09 — Tìm kiếm và trạng thái hàng chờ hồ sơ · M

- [x] Tìm đúng tài xế theo tên/SĐT/mã trên tập hồ sơ đầy đủ; tổng số và phân trang cập nhật đúng.
- [x] Tài khoản còn chờ quyết định không biến mất sau khi giấy tờ cuối cùng được duyệt; ghi rõ đơn vị số đếm.
- [ ] Có phản hồi khi đang gom dữ liệu/lỗi; đo số request và thời gian, ghi lại nhu cầu API hàng chờ theo tài xế nếu cần.

Phụ thuộc: T02, T08. File: `src/pages/Drivers.tsx`, `src/pages/documentApplications.ts`, `src/test/documents.test.tsx`, `tasks/plan.md`.
Kiểm chứng: nhiều trang giấy tờ, nhiều tài xế, tài khoản chưa duyệt và lỗi một request; không lọc chỉ một trang kết quả.

### T10 — Cung cấp điều kiện duyệt từ backend · M

- [x] Dùng metadata phù hợp sẵn có hoặc bổ sung dữ liệu chỉ đọc vào chi tiết admin để phản ánh đúng cấu hình giấy tờ bắt buộc.
- [x] Dữ liệu frontend phản ánh trường mới, tương thích với môi trường tích hợp; backend tiếp tục xác minh khi ghi.
- [x] Không tự thêm điều kiện kỹ năng/giấy tờ ngoài quy tắc hiện có.

Phụ thuộc: T01. File dự kiến: `backend/.../driver/dto/DriverOnboardingDtos.kt`, `backend/.../admin/service/AdminDriverService.kt`, test backend liên quan, `src/types.ts`, `src/test/fixtures.ts`.
Kiểm chứng: đổi cấu hình loại giấy tờ bắt buộc; test metadata và kiểm tra duyệt khi thiếu giấy tờ; frontend typecheck.

### Checkpoint C1

- [x] Theme/component chung và bộ lọc đạt; hợp đồng điều kiện duyệt đã xác nhận bằng test, ghi rõ phiên bản backend cần triển khai.

### T11 — Checklist duyệt và xử lý liên tiếp · M

- [x] Hiện giấy tờ thiếu/chờ/từ chối/đã duyệt; chưa thể duyệt tài khoản có lý do rõ trên màn hình.
- [x] Nhãn quyết định rõ; “Lưu và tiếp tục” chỉ chuyển sau thành công, lỗi giữ nội dung; không tự duyệt giấy tờ tiếp theo.
- [x] Cảnh báo nội dung chưa lưu khi đóng/chuyển; focus hợp lý; pending chặn gửi trùng.

Phụ thuộc: T07, T09–T10. File: `src/pages/DriverDocumentsDrawer.tsx`, `src/pages/DriverReviewForm.tsx`, `src/test/documents.test.tsx`, `src/styles.css`.
Kiểm chứng: thiếu giấy tờ, từ chối cần lý do, lỗi ghi, dữ liệu bị thay đổi bởi người khác, chuyển mục và đóng drawer ở cả hai theme.

## D. Tìm chuyến

### T12 — Backend tìm và lọc chuyến · M

- [x] Chốt hợp đồng tìm tên/SĐT khách/tài xế, khoảng thời gian tạo chuyến và tổ hợp trạng thái; validate dữ liệu đầu vào.
- [x] Truy vấn toàn dữ liệu, phân trang/count đúng, thứ tự ổn định; ràng buộc quyền admin được giữ.
- [ ] Biên ngày và múi giờ được thống nhất; kiểm tra truy vấn trên tập dữ liệu đại diện.

Phụ thuộc: T01. File dự kiến: `backend/.../ride/dto/request/RideListFilter.kt`, `backend/.../admin/service/AdminRideService.kt`, repository truy vấn liên quan, test backend, `tasks/plan.md` (hợp đồng đã chốt).
Kiểm chứng: test kết hợp điều kiện, biên ngày, không có kết quả, số trang/count và quyền truy cập; kiểm tra kế hoạch truy vấn nếu thêm điều kiện gây chậm.

### T13 — UI tra cứu chuyến và bộ lọc nhanh · M

- [x] Có tìm khách/tài xế, khoảng thời gian và lọc nhanh; giữ mở trực tiếp theo mã và nhãn lọc rõ.
- [x] URL, query key và API đồng bộ; đổi lọc về trang đầu, xóa lọc đúng; chỉ gửi tiêu chí được backend hỗ trợ.
- [x] Lỗi/không có kết quả có cách phục hồi; “Hôm nay” đúng múi giờ đã thống nhất.

Phụ thuộc: T08, T12 và backend test đã có hợp đồng mới. File: `src/pages/Rides.tsx`, `src/lib/api.ts`, `src/types.ts` nếu cần, `src/test/workflows.test.tsx`, `src/styles.css`.
Kiểm chứng: dùng SĐT để tìm chuyến không nằm ở trang đầu; kiểm tra filter+pagination+Back/Forward và DatePicker ở sáng/tối.

### Checkpoint D

- [ ] Luồng hỗ trợ qua SĐT và luồng duyệt hồ sơ chạy được trên môi trường test; kiểm tra frontend/backend liên quan đạt.

## E. Bảng và dữ liệu

### T14 — Bảng dùng chung và danh sách chuyến · M

- [x] Bảng kiểm soát được cột cố định, cuộn trong vùng bảng và ưu tiên cột; mã/trạng thái dễ tìm.
- [x] Địa chỉ dài đọc đầy đủ được bằng chuột/bàn phím/cảm ứng; tiền căn phải và cột thời gian nhất quán.
- [x] 320 px không tràn toàn trang; thao tác chính không buộc cuộn qua nhiều cột.

Phụ thuộc: T07. File: `src/components/common.tsx`, `src/components/RideTable.tsx`, `src/styles.css`, test bảng nếu có logic responsive mới.
Kiểm chứng: 320/768/1024/1440 px, phóng to 200%, danh sách dài và một dòng dữ liệu rất dài.

### T15 — Trình bày bảng giá và biểu mẫu · M

- [x] Cột thao tác luôn dễ truy cập; giá/đơn vị/khung giờ đêm dễ so sánh, bảng đang áp dụng rõ.
- [x] Biểu mẫu nhóm giá cơ bản/phụ phí/thời gian, định dạng số dễ đọc và lỗi gần trường nhập.
- [x] Giữ xác nhận thay thế/tắt bảng giá, cảnh báo tắt bảng giá cuối cùng và trạng thái pending.

Phụ thuộc: T14. File: `src/pages/Pricing.tsx`, `src/styles.css`, `src/test/workflows.test.tsx` hoặc test pricing tập trung mới.
Kiểm chứng: tạo/sửa/kích hoạt/tắt trên dữ liệu test, cảnh báo xung đột và modal sáng/tối trên màn hình hẹp.

### T16 — Bảng tài khoản và chỉ số dễ đọc · M

- [x] Bảng tài xế/khách hàng ưu tiên nhận diện và trạng thái; nội dung phụ/chi tiết tổ chức nhất quán với bảng chung.
- [ ] Tỷ lệ theo đúng đơn vị API đã xác nhận, số 0 khác dữ liệu chưa có; tooltip/diễn giải cho chỉ số cần ngữ cảnh.
- [x] Thông tin chi tiết và tiền/số dư nhất quán cả sáng/tối; không thay đổi ý nghĩa nghiệp vụ.

Phụ thuộc: T01, T14. File: `src/pages/Drivers.tsx`, `src/pages/Customers.tsx`, `src/lib/format.ts`, `src/styles.css`, test format tập trung mới.
Kiểm chứng: test tỷ lệ 0/biên/null và dữ liệu thật đã ẩn danh; đối chiếu kiểu dữ liệu backend trước khi nhân 100.

### Checkpoint E

- [x] Các bảng và biểu mẫu đạt hai theme/bốn kích thước; kiểm tra tổng thể frontend đạt.

## F. Phản hồi và nghiệm thu

### T17 — Thành phần trạng thái và thông báo dùng chung · M

- [x] Cho phép thông báo thành công theo hành động/đối tượng; dữ liệu lỗi mạng không bị báo thành công.
- [x] Phân biệt nút thử lại và đóng lỗi; trạng thái rỗng hỗ trợ lời giải thích/hành động phù hợp.
- [x] Có cách hiển thị tải lần đầu/làm mới/thời điểm cập nhật; phản hồi quan trọng truy cập được bằng công nghệ hỗ trợ.

Phụ thuộc: T07. File: `src/lib/hooks.ts`, `src/components/common.tsx`, `src/styles.css`, test component/hook tập trung mới.
Kiểm chứng: test callback retry/reset, lỗi ghi chưa rõ kết quả, thành công và dữ liệu cũ khi refetch lỗi.

### T18 — Áp dụng phản hồi cụ thể vào từng nghiệp vụ · M

- [x] Tổng quan hiển thị lần cập nhật và lỗi một phần; không gộp mọi trường hợp thiếu dữ liệu thành một trạng thái.
- [x] Chuyến/khách/bảng giá dùng thông báo cụ thể và nút khôi phục đúng; sửa các nút “Thử lại” chỉ reset lỗi.
- [x] Điều chỉnh phản hồi duyệt tài xế trong T11/T17 nếu cần; giữ hướng dẫn kiểm tra kết quả trước khi gửi lại thao tác ghi.

Phụ thuộc: T11, T13, T15, T17. File chính: `src/pages/Dashboard.tsx`, `src/pages/Rides.tsx`, `src/pages/Customers.tsx`, `src/pages/Pricing.tsx`, `src/test/workflows.test.tsx`. Nếu cần sửa drawer vượt năm file, tách việc bổ sung.
Kiểm chứng: lỗi tải lần đầu/làm mới, không có dữ liệu/lọc rỗng, lỗi ghi/ghi thành công; kiểm tra câu chữ tiếng Việt và tên đối tượng.

### T19 — Nghiệm thu giao diện và hồi quy · S

- [ ] Đủ bằng chứng các màn hình và kịch bản sáng/tối trong plan; kiểm tra bàn phím/focus/tương phản/200% zoom và responsive.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` và test backend liên quan đạt; ghi rõ mọi giới hạn môi trường còn lại.
- [x] Cập nhật trạng thái task và kết quả nghiệm thu; không đánh dấu phần chưa tích hợp backend hoặc chưa kiểm tra trực quan là hoàn thành.

Phụ thuộc: T02–T18. File: `tasks/plan.md`, `tasks/todo.md`; bằng chứng tại `.qa/`. Nếu phát hiện lỗi cần sửa source, mở task nhỏ tương ứng trước.
Kiểm chứng: toàn bộ checklist nghiệm thu ở mục 8 của plan, bằng dữ liệu test và browser thật; không thử thao tác ghi trên dữ liệu production.

### Checkpoint hoàn tất

- [ ] Luồng chính đạt, hai theme nhất quán, các phụ thuộc đã tích hợp và có kết quả kiểm chứng để review.

Ghi chú nghiệm thu: các mục còn trống được giải thích tại tasks/implementation.md. T01 chưa có ảnh baseline trước sửa; T03 còn kiểm tra cuộn thực tế; T09/T12 còn đo dữ liệu lớn; T16 còn đối chiếu đơn vị trên server thật; T19 còn zoom 200%, screen reader và tích hợp PostgreSQL. Các checkpoint D/hoàn tất đợi môi trường test tích hợp thật.
