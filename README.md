# AppGK — Kho Hàng

Ứng dụng quản lý sản phẩm đơn giản bằng **React Native + Expo + TypeScript**, chạy chung mã trên Android, iOS và web. Backend **Express + SQLite**, yêu cầu **Node.js 24 LTS**.

## Chạy ứng dụng

```bash
npm install
cp .env.example .env
npm run server
```

Mở terminal thứ hai:

```bash
npm run web
# Hoặc: npm run android / npm run ios
# Điện thoại thật: npm start, sau đó quét QR bằng Expo Go tương thích SDK 54.
```

Web mở tại `http://localhost:8081`. Tạo tài khoản ngay trên giao diện; không có tài khoản hay mật khẩu mặc định. Khởi động lại Expo sau khi sửa `.env`.

- Web/iOS simulator: `EXPO_PUBLIC_API_URL=http://localhost:3001`.
- Android emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001`.
- Điện thoại thật: dùng IP LAN của máy chạy backend, ví dụ `http://192.168.1.10:3001`. Hai thiết bị cùng mạng; cho phép cổng 3001 qua tường lửa.
- `PORT`, `DATABASE_PATH`, `CORS_ORIGINS` là biến môi trường phía server. Muốn nạp chúng từ `.env`, dùng `node --env-file=.env server/index.mjs` (lệnh `npm run server` dùng biến môi trường hiện tại hoặc giá trị mặc định).
- Android/iOS cần Android Studio/Xcode hoặc Expo Go tương thích. Xây dựng phát hành cần cấu hình ký ứng dụng riêng.

## Chức năng

- Đăng ký, đăng nhập, khôi phục phiên và đăng xuất.
- Thêm/sửa/xóa sản phẩm gồm tên, SKU, giá VNĐ nguyên và số lượng.
- Xác nhận trước khi xóa; kiểm tra dữ liệu ở cả giao diện và API; SKU duy nhất trong tài khoản.
- React Context + hooks quản lý trạng thái reactive: danh sách cập nhật ngay sau thêm/sửa/xóa khi API xác nhận thay đổi, không cần tải lại trang.
- Hiển thị trạng thái tải, lỗi mạng và ngăn gửi thao tác trùng.

## Cấu trúc và cơ sở dữ liệu

- `App.tsx`: giao diện responsive, đăng nhập và quản lý sản phẩm.
- `src/store.tsx`: trạng thái reactive, gọi API, lưu phiên bằng AsyncStorage.
- `server/index.mjs`: API, xác thực và SQLite.
- `server/api.test.mjs`: kiểm thử tích hợp.

SQLite tự tạo tại `server/data/app.db`, không đưa vào Git. Ba bảng `users`, `sessions`, `products`; mỗi sản phẩm thuộc một tài khoản. API luôn giới hạn truy vấn theo người đăng nhập. Giá là số nguyên VNĐ để tránh sai số số thực. Sao lưu thư mục dữ liệu khi server dừng hoặc dùng SQLite backup API khi đang chạy; không chỉ sao chép file `.db` khi WAL đang hoạt động.

Mật khẩu dùng scrypt với salt ngẫu nhiên; token phiên ngẫu nhiên 256 bit, server chỉ lưu SHA-256 token, hết hạn sau 7 ngày. Có giới hạn tần suất đăng nhập, prepared statements và Helmet. AsyncStorage không phải kho bí mật mã hóa: trước khi phát hành native nên chuyển token sang SecureStore; bản web nên cân nhắc cookie HttpOnly với bảo vệ CSRF. Triển khai thực tế cần HTTPS, origin chính xác, sao lưu dữ liệu và điều chỉnh giới hạn tải; SQLite phù hợp bản nhỏ chạy một máy chủ.

## API

| Phương thức | Đường dẫn | Chức năng |
|---|---|---|
| POST | `/api/auth/register` | `{name,email,password}` |
| POST | `/api/auth/login` | `{email,password}` |
| GET | `/api/auth/me` | Thông tin tài khoản |
| POST | `/api/auth/logout` | Thu hồi phiên hiện tại |
| GET | `/api/products` | Danh sách của tài khoản |
| POST | `/api/products` | `{name,sku,price,quantity}` |
| PUT | `/api/products/:id` | Cập nhật toàn bộ thông tin sản phẩm |
| DELETE | `/api/products/:id` | Xóa sản phẩm |

Sau đăng nhập, gửi header `Authorization: Bearer <token>` cho các API được bảo vệ.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run build:web
```

Kiểm thử API dùng database tạm và kiểm tra đăng ký/đăng nhập, dữ liệu không hợp lệ, SKU trùng, cách ly tài khoản, CRUD, lưu dữ liệu và phiên qua lần mở lại database, cùng thu hồi token khi đăng xuất.
