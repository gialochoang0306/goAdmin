# Kế hoạch cải thiện UI/UX, dark mode và thẩm mỹ web admin

Ngày lập: 05/11/2026 · Trạng thái: đã triển khai mã nguồn; nghiệm thu môi trường thật còn một số mục.

Phạm vi: ứng dụng `PTITgo_admin` hiện có trên máy. Checklist thực hiện nằm tại [todo.md](todo.md).

Kết quả triển khai và các giới hạn kiểm chứng: [implementation.md](implementation.md). Backend cần được cập nhật cùng frontend để bật bộ lọc chuyến nâng cao và metadata điều kiện duyệt. Các mục kiểm tra PostgreSQL thật, hiệu năng với hàng chờ lớn và zoom trình duyệt 200% chưa được đánh dấu hoàn tất.

## 1. Mục tiêu và giả định

- Giúp nhân viên vận hành tìm đúng chuyến, mở đúng hồ sơ và xử lý công việc với ít thao tác hơn.
- Làm rõ điều kiện duyệt, kết quả thao tác và trạng thái dữ liệu để giảm nhầm lẫn.
- Nâng thẩm mỹ theo hướng gọn, rõ và nhất quán; giữ thương hiệu Lái Hộ cùng màu đỏ đô.
- Bổ sung ba chế độ giao diện: **Sáng / Tối / Theo hệ thống**; mặc định Theo hệ thống khi chưa có lựa chọn.
- Ưu tiên laptop và desktop phục vụ vận hành; điện thoại vẫn phải tra cứu và hoàn tất các thao tác chính được.
- Tiếp tục dùng React, TypeScript, Ant Design, React Query và React Router hiện có. Chưa cần đổi thư viện UI hay thêm bộ icon/font từ dịch vụ ngoài.
- Đây là kế hoạch dựa trên đọc mã nguồn. Chưa có bằng chứng kiểm tra trực quan hoàn chỉnh: trình duyệt nhúng không kết nối được bản xem thử cục bộ và Computer Use đã dừng do không xác định chắc chắn URL trên Windows. Các nghi vấn bố cục phải được xác minh ở T01.

## 2. Hiện trạng và phạm vi sửa

| Mã | Bất tiện / yêu cầu | Kết quả cần đạt | Task |
|---|---|---|---|
| UX01 | Tìm chuyến chỉ có trạng thái và mở theo mã | Tìm khách/tài xế, lọc thời gian trên toàn bộ dữ liệu | T12–T13 |
| UX02 | “Xem hồ sơ” từ Tổng quan mở hàng chờ chung | Mở đúng hồ sơ đã chọn, có đường dẫn truy cập lại | T02 |
| UX03 | Chưa chỉ rõ giấy tờ bắt buộc còn thiếu | Checklist theo quy tắc backend, giải thích vì sao chưa thể duyệt | T10–T11 |
| UX04 | Duyệt nhiều giấy tờ phải mở/lưu từng mục | Quyết định rõ ràng, có tiến độ và “Lưu và tiếp tục” | T11 |
| UX05 | Bảng rộng, cột thao tác nằm ngoài vùng nhìn | Cố định cột cần thiết, ưu tiên nội dung, cải thiện màn hình hẹp | T14–T16 |
| UX06 | Chuyển từ chuyến sang khách/tài xế dễ mất ngữ cảnh | Quay lại đúng nguồn, giữ bộ lọc và phân trang | T03 |
| UX07 | Bộ lọc thiếu nhãn thường trực và đặt lại chung | Nhãn luôn hiện, điều kiện đang áp dụng rõ, xóa bộ lọc nhanh | T08–T09, T13 |
| UX08 | Tổng quan đếm giấy tờ, hàng chờ đếm hồ sơ | Phân biệt đơn vị và giữ tài khoản chờ quyết định trong hàng chờ | T02, T09 |
| UX09 | Tỷ lệ và dữ liệu thiếu chưa dễ hiểu | Đúng đơn vị %, giải thích dữ liệu chưa có | T16 |
| UX10 | Thành công chung chung; “Thử lại” đôi khi chỉ xóa lỗi | Thông báo đúng hành động, retry đúng nghĩa, hướng phục hồi rõ | T17–T18 |
| UI01 | Thiếu hệ thống thẩm mỹ xuyên suốt | Màu, chữ, khoảng cách, bố cục và trạng thái đồng nhất | T04, T07, T14–T16 |
| UI02 | Chưa có dark mode | Toàn ứng dụng hỗ trợ Sáng / Tối / Theo hệ thống | T04–T07, T19 |

## 3. Định hướng thẩm mỹ

### Bố cục và thứ bậc

- Dùng nền trung tính, bề mặt nội dung phân tầng nhẹ; đỏ đô tập trung ở thương hiệu, mục đang chọn và hành động chính.
- Mỗi màn hình có tiêu đề, mô tả ngắn khi cần và một hành động chính nổi bật. Hủy/khóa/từ chối dùng kiểu cảnh báo riêng, không lẫn với màu thương hiệu.
- Sidebar gọn, dễ nhận biết mục hiện tại; topbar dành cho ngữ cảnh, lựa chọn giao diện và tài khoản. Không để các nút này tranh chỗ ở màn hình hẹp.
- Giảm khung và khoảng trống không phục vụ việc đọc dữ liệu. Dashboard ưu tiên công việc cần xử lý và đường dẫn đi tiếp.
- Dùng thang khoảng cách 4/8/12/16/24/32 px; bo góc 6–8 px; đường viền nhẹ và bóng đổ tiết chế.

### Chữ, bảng và biểu mẫu

- Font hệ thống hỗ trợ tiếng Việt; nội dung chính khoảng 14 px, thông tin phụ 12–13 px, tiêu đề trang 24–28 px. Kiểm tra thực tế trước khi chốt.
- Số tiền/số lượng căn phải, thống nhất định dạng; mã và tên đối tượng dễ quét; nội dung phụ không nhạt đến mức khó đọc.
- Nhãn biểu mẫu luôn hiển thị. Placeholder chỉ là ví dụ nhập liệu; lỗi nằm gần trường liên quan.
- Bảng có hover/focus rõ, trạng thái kèm chữ, hạn chế xuống dòng bất quy tắc. Địa chỉ dài có cách xem đầy đủ bằng chuột, bàn phím và cảm ứng.
- Thao tác phụ dùng nút nhẹ; hành động quan trọng có nhãn cụ thể. Không biến cả hàng thành vùng bấm gây xung đột với link/nút bên trong.

### Màn hình mẫu để chốt thiết kế

Trước khi áp dụng rộng, dùng ba màn hình đại diện: Tổng quan, danh sách Chuyến đi và drawer Duyệt hồ sơ. So sánh cùng dữ liệu trong hai giao diện sáng/tối; ghi nhận quyết định cuối cùng tại tài liệu này. Có thể dùng tài liệu/reference do người dùng cung cấp hoặc catalogue phù hợp khi triển khai; lấy cấu trúc làm tham khảo, giữ nhận diện riêng của sản phẩm.

## 4. Đặc tả dark mode

### Hành vi

1. Người dùng chọn Sáng, Tối hoặc Theo hệ thống ở topbar; trang đăng nhập cũng có lựa chọn truy cập được.
2. Lưu **chỉ tùy chọn giao diện** trên trình duyệt, ví dụ key `ptitgo-admin-theme`; không cần API tài khoản.
3. Khi chọn Theo hệ thống, ứng dụng cập nhật theo `prefers-color-scheme`; khi chọn Sáng/Tối, thiết lập hệ thống không ghi đè lựa chọn đó.
4. Tải lại trang, chuyển route, đăng xuất/đăng nhập không làm mất tùy chọn. Nếu bộ nhớ trình duyệt bị chặn hoặc giá trị hỏng, ứng dụng vẫn mở được.
5. Áp dụng nền/chế độ ban đầu trước khi nội dung hiển thị để tránh chớp nền sáng trong chế độ tối; kiểm tra cả khi tải chậm và với cấu hình CSP nếu có.
6. Chuyển theme không tải lại trang, không xóa bộ lọc, đóng drawer hoặc làm mất dữ liệu biểu mẫu đang nhập.

### Cách tích hợp dự kiến

- Tận dụng `ConfigProvider` và `theme.defaultAlgorithm` / `theme.darkAlgorithm` của bản Ant Design đang cài; đã xác nhận hai algorithm có trong khai báo thư viện cục bộ.
- Tạo token theo ý nghĩa: nền trang, bề mặt, bề mặt nổi, chữ chính/phụ, viền, thương hiệu, hover, focus, thành công, cảnh báo và nguy hiểm.
- Dùng CSS custom properties cho phần tự viết; đồng bộ với token Ant Design. Rà soát các màu gán trực tiếp trong `src/styles.css`, không chỉ đổi nền `body`.
- Cho phép tinh chỉnh token thương hiệu ở giao diện tối để chữ/nút vẫn rõ; sắc đỏ cụ thể được chốt sau khi đo tương phản.
- Theme phải phủ cả Modal, Drawer, Select dropdown, DatePicker, Tooltip, thông báo và preview ảnh mở qua portal.
- Giữ nguyên màu ảnh giấy tờ, ảnh bàn giao và ảnh xe; không dùng `invert()` hoặc bộ lọc đổi màu toàn trang.
- Giảm hiệu ứng khi người dùng bật `prefers-reduced-motion`; focus/hover/selected/disabled phải phân biệt được ở cả hai theme.

### Chuẩn nghiệm thu thị giác

- Tương phản chữ thường tối thiểu 4.5:1; chữ lớn 3:1. Đường biên/biểu tượng cần thiết để nhận biết điều khiển đạt 3:1 với màu liền kề.
- Trạng thái luôn có chữ hoặc biểu tượng phù hợp, không chỉ dựa vào đỏ/xanh.
- Mọi điều khiển dùng được bằng bàn phím và có focus nhìn rõ; lựa chọn theme có tên truy cập và thể hiện chế độ đang chọn.
- Không có mảng nền sáng ngoài ý muốn trong dark mode; vùng ảnh/tài liệu giữ màu nội dung gốc.

## 5. Thay đổi UX theo luồng

### Tổng quan → duyệt hồ sơ

- Nút “Xem hồ sơ” mở đúng tài xế bằng tham số URL, ví dụ `/driver-documents?driverId=41&status=PENDING`.
- Tải lại/Back/Forward vẫn phản ánh hồ sơ đang mở. Đóng drawer chỉ bỏ tham số hồ sơ và giữ bộ lọc hàng chờ.
- Nếu hồ sơ đã xử lý, bị xóa hoặc không thuộc bộ lọc hiện tại, thông báo rõ; không âm thầm mở hồ sơ khác.
- Phân biệt “giấy tờ chờ duyệt”, “hồ sơ có giấy tờ chờ duyệt” và “tài khoản chờ quyết định”. Chỉ hiển thị số đếm chính xác theo hợp đồng API đã xác nhận; không suy ra số hồ sơ từ một trang giấy tờ.
- Hàng chờ có tìm tên/SĐT/mã tài xế, nhãn trạng thái, thời gian gửi và sắp xếp rõ. Bộ đếm ghi rõ đang đếm giấy tờ hay tài xế.

### Duyệt trong một hồ sơ

- Hiển thị danh sách giấy tờ bắt buộc, thiếu/chờ duyệt/từ chối/đã duyệt và điều kiện duyệt tài khoản.
- Backend hiện có cấu hình `app.driver.required-document-types` và mặc định `CCCD,DRIVER_LICENSE`. Không hardcode mặc định này thành quy tắc cố định ở frontend.
- Kiểm tra nguồn metadata hiện có; nếu chưa phù hợp cho admin, bổ sung trường chỉ đọc về điều kiện/khả năng duyệt vào API chi tiết. Backend vẫn quyết định cuối cùng và kiểm tra lại khi gửi.
- Không tự biến xác minh kỹ năng thành điều kiện duyệt tài khoản: mã backend đã đọc hiện kiểm tra loại giấy tờ bắt buộc. Mọi thay đổi quy tắc nghiệp vụ phải được xác nhận riêng.
- Nút tài khoản chưa đủ điều kiện cần có giải thích nhìn thấy được, không chỉ tooltip trên nút disabled.
- Quyết định tài liệu/tài khoản dùng nhãn rõ; tránh coi lựa chọn mặc định là quyết định đã được người dùng xác nhận. Từ chối giấy tờ tiếp tục yêu cầu lý do.
- “Lưu và tiếp tục” chỉ chuyển mục sau khi máy chủ xác nhận thành công; lỗi giữ nguyên mục và nội dung đang nhập, không tự động duyệt mục tiếp theo.
- Khi đóng/chuyển tài liệu đang có nội dung chưa lưu, cảnh báo mất nội dung. Giữ các chặn thao tác trong lúc đang gửi.

### Tra cứu chuyến

- Giữ mở trực tiếp theo mã; bổ sung tìm theo tên/SĐT khách và tài xế, khoảng thời gian tạo chuyến, nhóm trạng thái nhanh.
- Giai đoạn đầu chưa đưa tìm địa chỉ vào phạm vi bắt buộc; chỉ bổ sung khi nhu cầu và API tìm kiếm được xác nhận.
- Hợp đồng đề xuất: `q`, `createdFrom`, `createdTo`, `status`, `page`, `size`; chốt tên và ngữ nghĩa ở T12 trước khi làm UI.
- Khoảng thời gian dùng đầu bao gồm/cuối loại trừ; lựa chọn “Hôm nay” theo múi giờ nghiệp vụ Việt Nam và được chuyển đổi nhất quán với cách lưu thời gian của backend.
- Tìm kiếm và lọc áp dụng trên toàn bộ tập dữ liệu ở máy chủ, phân trang/số đếm đúng; không lọc riêng trang 20 dòng đang hiển thị.
- Lưu điều kiện lên URL, đặt lại về trang đầu khi đổi lọc; giữ kết quả/điều kiện hợp lý khi quay lại từ chi tiết.

### Bảng, điều hướng và phản hồi

- Dùng nhãn thường trực cho bộ lọc; nút “Xóa bộ lọc” giữ nguyên cỡ trang và đưa phân trang về đầu.
- Ưu tiên cột tên/mã, trạng thái, dữ liệu cần hành động; cố định cột nhận diện và thao tác khi cuộn ngang không gây che phủ trên màn hình nhỏ.
- Trên điện thoại, giữ các thao tác chính trong vùng nhìn bằng danh sách tóm tắt hoặc chi tiết mở rộng; cuộn ngang chỉ nằm trong vùng bảng, không làm tràn cả trang.
- Quay lại đúng chuyến/tổng quan/danh sách nguồn, kèm bộ lọc và trang. Chỉ chấp nhận đường dẫn nội bộ hợp lệ làm nguồn quay lại.
- Tỷ lệ được định dạng sau khi xác nhận API dùng 0–1 hay 0–100; phân biệt số 0 với dữ liệu chưa có. Không đổi quy tắc tiền hoặc múi giờ hiện tại ngoài hợp đồng đã thống nhất.
- Phân biệt tải lần đầu, đang làm mới, không có dữ liệu, lọc không ra kết quả và lỗi tải. Hiện thời điểm cập nhật gần nhất ở màn hình tự làm mới.
- Thông báo thành công nêu hành động/đối tượng. “Thử lại” phải thực sự thử lại thao tác phù hợp; nút chỉ xóa lỗi dùng “Đóng thông báo”.
- Không tự gửi lại thao tác ghi khi chưa xác nhận kết quả; hướng dẫn làm mới để kiểm tra, giữ các xác nhận hành động nguy hiểm hiện có.

## 6. Thứ tự triển khai

| Giai đoạn | Task | Đầu ra |
|---|---|---|
| A. Xác minh và sửa luồng truy cập | T01–T03 | Baseline trực quan, mở đúng hồ sơ, quay lại đúng ngữ cảnh |
| B. Nền thiết kế và theme | T04–T07 | Token thống nhất, dark mode, shell và component chung |
| C. Lọc và duyệt hồ sơ | T08–T11 | Bộ lọc rõ, tìm hàng chờ, checklist và xử lý liên tiếp |
| D. Tìm chuyến | T12–T13 | Backend tìm/lọc đầy đủ và UI đồng bộ URL |
| E. Bảng và dữ liệu | T14–T16 | Bảng dễ đọc/thao tác, bảng giá và hồ sơ thẩm mỹ hơn |
| F. Phản hồi và nghiệm thu | T17–T19 | Trạng thái rõ, lỗi phục hồi đúng, kiểm chứng sáng/tối và responsive |

Thứ tự mặc định: A → B → C → D → E → F. T12 có thể được chuẩn bị sớm nếu cần phối hợp backend; T13 phụ thuộc hợp đồng T12. Mỗi task và checkpoint chi tiết được theo dõi duy nhất trong [todo.md](todo.md).

## 7. Phụ thuộc, rủi ro và giới hạn

| Vấn đề | Cách xử lý |
|---|---|
| Chưa kiểm tra trực quan được | T01 bắt buộc ghi lại bằng chứng runtime; không coi nhận xét từ CSS là lỗi đã tái hiện |
| Backend `/api/admin/rides` hiện chỉ có status/page/size trong `RideListFilter` | T12 bổ sung hợp đồng và truy vấn; T13 không hứa hỗ trợ tìm kiếm khi server chưa triển khai |
| API hàng chờ hiện phân trang theo giấy tờ; frontend tải đủ rồi gom theo tài xế | T09 có thể tìm trên tập đã tải đầy đủ nhưng phải đo số request/thời gian. Nếu không đạt trải nghiệm thực tế, lập nhánh việc API hàng chờ theo tài xế; không âm thầm hiển thị kết quả thiếu |
| Cấu hình giấy tờ bắt buộc thay đổi theo môi trường | T10 trả metadata thực tế; frontend không tự sao chép cấu hình mặc định |
| Backend trong workspace có thể khác backend đang chạy | Kiểm tra phiên bản/hợp đồng của môi trường test trước khi tích hợp; ghi rõ phần phụ thuộc triển khai backend |
| CSS đang có nhiều màu gán trực tiếp và override Ant Design | T04/T07 chuyển theo component, đo tương phản và kiểm tra portal cả hai theme |
| Thư mục có thay đổi chưa commit từ trước | Ghi nhận baseline, bảo toàn chúng; không reset/ghi đè và không gộp ngoài phạm vi |
| Repo admin riêng và monorepo PTITgoo khác nhau | Trước khi commit/push triển khai, xác định repo đích; bản plan này nằm trong thư mục admin hiện tại |

Phạm vi chưa bao gồm: thay backend đăng nhập, đổi phân quyền, bản đồ điều phối trực tiếp, nghiệp vụ duyệt hàng loạt, đồng bộ theme qua tài khoản, sửa cấu hình Vercel hoặc tự triển khai production.

## 8. Kiểm chứng khi triển khai

Chạy từ thư mục `PTITgo_admin`:

```powershell
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

- Dùng Vitest/Testing Library hiện có cho logic theme, URL/bộ lọc, quay lại ngữ cảnh, điều kiện duyệt, chuyển mục sau khi lưu và trạng thái lỗi. Kiểm tra hành vi thay vì snapshot khớp từng class CSS.
- Backend: dùng test tích hợp/truy vấn phù hợp với thay đổi T10/T12; lệnh nền từ thư mục `backend` là `.\gradlew.bat test`. Chốt môi trường DB/test trước khi chạy.
- Kiểm tra browser thật ở 320, 768, 1024 và 1440 px; thêm một kích thước laptop phổ biến của người dùng nếu khác.
- Chụp sáng/tối cùng dữ liệu cho đăng nhập, tổng quan, chuyến và chi tiết, tài xế và chi tiết, drawer duyệt, khách hàng và chi tiết, bảng giá và biểu mẫu.
- Kiểm tra bàn phím, focus trong Modal/Drawer, đóng bằng Escape khi an toàn, trả focus về vị trí mở, phóng to 200%, dữ liệu dài và ảnh lỗi.
- Kịch bản bắt buộc: khách gọi bằng SĐT → tìm chuyến → xem khách/tài xế → quay lại chuyến; Tổng quan → mở đúng hồ sơ → xử lý giấy tờ → duyệt tài khoản → trở lại hàng chờ.
- Kiểm tra theme khi lần đầu truy cập, tải lại, đổi cài đặt hệ thống, bộ nhớ bị chặn, portal đang mở và form đang nhập.
- Với mỗi phần đã thay đổi, kiểm tra pending/empty/error/success và dữ liệu cũ khi làm mới lỗi; không cần viết test cho từng thay đổi khoảng cách thuần CSS.

Hoàn tất khi các tiêu chí trong `todo.md` đạt, có bằng chứng runtime cho luồng chính và hai theme, các kiểm tra liên quan thành công, và những phụ thuộc backend còn chưa có được ghi rõ thay vì đánh dấu hoàn thành.

## 9. Các quyết định đã chốt khi triển khai

- Theme tích hợp tại `src/theme/ThemeProvider.tsx`, lựa chọn ở `src/components/ThemeSwitcher.tsx`, khởi tạo sớm bằng `public/theme-init.js`. Bộ màu semantic nằm trong `src/styles.css` và token Ant Design của provider.
- UI nhỏ hơn 576 px dùng hai ô ngày native; desktop dùng RangePicker có nhãn riêng cho ngày đầu/cuối. Thay đổi này giải quyết popup hai lịch bị cắt ở màn hình 320 px.
- Bỏ chiều rộng tối thiểu của body để không gây tràn khi thanh cuộn dọc chiếm chỗ. Bảng dùng thẻ tóm tắt ở breakpoint điện thoại.
- Router dùng `createBrowserRouter`/`RouterProvider` để chặn Back/rời trang khi hồ sơ chưa lưu. `ScrollRestoration` lưu theo đường dẫn và query.
- Hợp đồng tìm chuyến: `q` tối đa 200 ký tự; `createdFrom` bao gồm và `createdTo` loại trừ, đều là ISO Instant; kết hợp với `status`, `page`, `size`. `q` tìm tên/SĐT khách hoặc tài xế, không bỏ dấu; `%`, `_`, `!` được tìm theo nghĩa ký tự, không thành wildcard.
- URL frontend dùng `from`/`to` dạng ngày lịch. API nhận mốc ngày giờ Việt Nam (+07:00) chuyển thành UTC, cộng một ngày cho cận trên.
- `GET /api/admin/rides/filter-capabilities` trả `{search: true, createdRange: true}` trong envelope hiện có. Khi server chưa xác nhận khả năng lọc, UI không gửi lọc nâng cao và không hiển thị danh sách chưa lọc như thể đã áp dụng điều kiện.
- Chi tiết tài xế thêm `required_document_types`, normalize thành `requiredDocumentTypes`. Server cũ thiếu trường này vẫn giữ kiểm tra cuối cùng ở server; UI không tự đoán cấu hình giấy tờ.
- H2 chỉ là dependency test backend, không thay cơ sở dữ liệu production. Môi trường Vitest giữ AbortSignal/AbortController cùng realm với Node Request khi kiểm tra data router trong jsdom.

Nguồn kỹ thuật: [Ant Design theme](https://ant.design/docs/react/customize-theme/), [React external store](https://react.dev/reference/react/useSyncExternalStore), [React Router navigation blocker](https://reactrouter.com/api/hooks/useBlocker), [Spring Data JPA Specifications](https://docs.spring.io/spring-data/jpa/reference/jpa/specifications.html). Đối chiếu thêm với các khai báo thư viện đã cài trong dự án.
