# Deploy admin lên Vercel

Backend dùng chung: `https://api.ptitgo.me`.

## 1. Đưa cấu hình lên GitHub

Đưa `vercel.json`, `.env.production`, `.gitignore` và tài liệu này lên repo
cùng phiên bản code admin muốn triển khai. `.env.production` chỉ chứa URL API
công khai; không chứa thông tin xác thực máy chủ.

File `.env.vercel.local` đã được chuẩn bị riêng trên máy từ Firebase Web config
trong `.env.local`. File này được Git bỏ qua: không commit, không gửi vào chat.
Kiểm tra Firebase project trong file đúng với project backend team đang dùng.
Nếu chưa đúng, thay bằng Web config do team cung cấp.

## 2. Import repository vào Vercel

1. Vào https://vercel.com/new, kết nối GitHub và Import repo admin.
2. Framework Preset: **Vite**.
3. Root Directory: **.** nếu repo riêng là PTITgo_admin; **PTITgo_admin** nếu
   repo chứa cả hệ thống. `vercel.json` phải nằm trong Root Directory này.
4. Node.js Version: **24.x**.
5. Install Command: `pnpm install --frozen-lockfile`.
6. Build Command: `pnpm build`; Output Directory: `dist`.
7. Trong Environment Variables, dùng Import .env để nhập `.env.vercel.local`.
   Áp dụng cho **Production**. File có `ENABLE_EXPERIMENTAL_COREPACK=1` để
   chọn pnpm theo `packageManager` trong package.json.
8. Deploy, rồi ghi lại domain production Vercel cấp thực tế.

Không dùng `pnpm dev` hoặc `pnpm preview` làm lệnh chạy production.
Firebase Web config được nhúng trong trình duyệt; không thêm service account,
private key hoặc mật khẩu vào biến VITE_*.

## 3. Team backend cập nhật CORS

Sau khi có domain admin thực tế, nhờ người vận hành backend thêm origin đó
vào `APP_CORS_ALLOWED_ORIGINS`, giữ lại các origin đang được sử dụng. Ví dụ
nếu Vercel cấp đúng domain dưới đây:

```env
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,https://ptitgo-admin.vercel.app
```

Tên domain trên chỉ là ví dụ; không có dấu / ở cuối origin. Khởi động lại hoặc
deploy lại backend sau khi đổi biến. Không mở wildcard cho mọi preview domain.
Nếu dùng domain riêng, bổ sung origin domain riêng vào danh sách này.

## 4. Tài khoản và kiểm tra

- Firebase Authentication bật Email/Password; frontend và backend cùng project.
- Tài khoản có hồ sơ ADMIN, trạng thái ACTIVE trong backend. Firebase user
  đơn thuần chưa đủ quyền admin. Admin đã có thì không cần bootstrap lại.
- Đăng nhập, mở dashboard/danh sách, mở trang chi tiết rồi F5 để kiểm tra SPA.
- Trong Network, request phải tới `https://api.ptitgo.me/api/...`.
- Kiểm tra thao tác ghi chỉ trên dữ liệu thử hoặc thao tác đã được team cho phép.

## 5. Cập nhật và khôi phục

Push nhánh production đã cấu hình để Vercel tạo deployment mới. Khi đổi biến
môi trường, redeploy để Vite nhúng giá trị mới vào bundle. Biến môi trường
trên Vercel ưu tiên hơn `.env.production`. Khi build trên máy cá nhân, kiểm tra
thêm `.env.production.local` và biến môi trường của terminal nếu API khác dự kiến.

Nếu lỗi, trong Deployments chọn bản production tốt trước đó và dùng chức năng
Rollback/Promote có sẵn của Vercel; sau đó kiểm tra lại đăng nhập và API.

| Lỗi | Xử lý |
| --- | --- |
| F5 trang chi tiết bị 404 | Kiểm tra Root Directory và vercel.json đã lên GitHub |
| Request gọi localhost | Kiểm tra VITE_API_BASE_URL trên Vercel, rồi redeploy |
| CORS | Backend thêm đúng origin admin và khởi động lại |
| 401 | Kiểm tra token và Firebase project giữa frontend/backend |
| 403 | Kiểm tra quyền ADMIN và trạng thái tài khoản |
| Build lỗi pnpm | Kiểm tra Corepack bật và pnpm 10.34.7 trong build log |

Tài liệu: https://vercel.com/docs/frameworks/frontend/vite và
https://vercel.com/docs/builds/configure-a-build.
