# AppGK — Kho Hàng

Ứng dụng quản lý sản phẩm đơn giản bằng **React Native + Expo + TypeScript**, chạy chung mã trên Android, iOS và web. Backend **Express + SQLite**, yêu cầu **Node.js 24 LTS**.

## Chạy bằng VS Code trên Windows và máy ảo Pixel 7

### 1. Cài công cụ

- Node.js **24 LTS** (`node -v` phải hiển thị `v24...`), Git và Visual Studio Code.
- Android Studio → SDK Manager: cài Android SDK Platform, Android SDK Platform-Tools và Android Emulator.
- Android Studio → Device Manager → Create Device → **Pixel 7** → chọn Android API 35 với Google APIs → Finish → nhấn ▶. Chờ Android khởi động hoàn toàn.
- Trên Windows, đặt biến `ANDROID_HOME` thành đường dẫn SDK hiển thị trong SDK Manager (thường là `%LOCALAPPDATA%\Android\Sdk`) và thêm `%ANDROID_HOME%\platform-tools` vào `Path`. Mở lại VS Code sau khi sửa biến môi trường.

### 2. Mở đúng thư mục

Nếu chưa tải mã nguồn, chạy PowerShell:

```powershell
git clone https://github.com/TanTai08/AppGK.git
cd AppGK
code .
```

Nếu đã có repo, **không clone lại**. Mở thư mục chứa `package.json` bằng File → Open Folder, rồi chạy `git pull` để lấy bản mới. Nếu thư mục của bạn lồng nhau như `D:\AppGK\AppGK`, phải mở thư mục bên trong.

### 3. Cài đặt và khởi động backend

Trong terminal VS Code, tại thư mục có `package.json`:

```powershell
npm install
npm run setup
npm run server
```

`setup` tạo `.env` nếu chưa có và giữ nguyên cấu hình đã có. Backend đọc `.env`, tự tạo SQLite tại `server/data/app.db`. Khi thấy `API ready on port 3001`, giữ terminal chạy. Có thể mở `http://localhost:3001/api/health` để kiểm tra; kết quả là `{"ok":true}`.

### 4. Chạy ứng dụng trên Pixel 7

Giữ máy ảo đang mở. Mở terminal thứ hai trong cùng thư mục:

```powershell
npm run android
```

Expo sẽ cài/mở Expo Go tương thích SDK 54 trên máy ảo. Đăng ký tài khoản mới rồi đăng nhập và thêm/sửa/xóa sản phẩm. Không có tài khoản mặc định. Không cần build APK để chạy thử bằng Expo Go.

Có thể dùng Terminal → Run Task trong VS Code, chọn `AppGK: Backend`, sau đó `AppGK: Android Pixel 7`.

### Địa chỉ API

File `.env` mặc định để trống `EXPO_PUBLIC_API_URL`; ứng dụng tự chọn:

| Nền tảng                   | API mặc định            |
| -------------------------- | ----------------------- |
| Pixel 7 / Android emulator | `http://10.0.2.2:3001`  |
| Web / iOS simulator        | `http://localhost:3001` |

`10.0.2.2` là địa chỉ máy tính từ Android emulator. Nếu `.env` cũ đang đặt `http://localhost:3001`, hãy sửa thành `EXPO_PUBLIC_API_URL=` hoặc `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001` rồi chạy lại `npm run android:clear`.

Điện thoại thật cần đặt `EXPO_PUBLIC_API_URL=http://IP_LAN_MAY_TINH:3001`, hai thiết bị cùng mạng và cho phép cổng 3001 qua tường lửa. Sau đó chạy `npm start` và quét QR bằng Expo Go tương thích SDK 54.

Để chạy web: giữ backend chạy và dùng `npm run web`, mở `http://localhost:8081`. iOS simulator cần macOS/Xcode và `npm run ios`.

### Lỗi thường gặp

| Lỗi                                       | Cách xử lý                                                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `destination path 'AppGK' already exists` | Không clone lại; mở thư mục AppGK có `package.json`.                                                                                                       |
| Không tìm thấy `package.json`             | Terminal đang ở sai thư mục; chuyển vào thư mục chứa file.                                                                                                 |
| `expo/tsconfig.base` chưa tìm thấy        | Chạy `npm install`; trong VS Code dùng `TypeScript: Restart TS Server` sau khi cài xong.                                                                   |
| PowerShell chặn `npm.ps1`                 | Dùng `npm.cmd` thay `npm`, hoặc đổi terminal VS Code sang Command Prompt.                                                                                  |
| Không tìm thấy thiết bị / `adb`           | Mở Pixel 7, kiểm tra `adb devices`; phải thấy `emulator-... device`. Kiểm tra `ANDROID_HOME` và `Path`.                                                    |
| Không kết nối được API                    | Kiểm tra backend đang chạy, API là `10.0.2.2:3001` trên emulator; thử mở `http://10.0.2.2:3001/api/health` trong Chrome của máy ảo.                        |
| Expo Go không tương thích                 | Để Expo CLI cài bản tương thích SDK 54 trên emulator; có thể tải bản Android phù hợp từ `https://expo.dev/go?sdkVersion=54&platform=android&device=false`. |
| Expo không tải được ứng dụng              | Thử `npx expo start --android --localhost --clear` khi máy ảo đang mở.                                                                                     |
| Cổng 3001 đang được dùng                  | Dừng backend cũ trước khi chạy lại; nếu đổi cổng, đổi cả địa chỉ API trong `.env`.                                                                         |

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

| Phương thức | Đường dẫn            | Chức năng                           |
| ----------- | -------------------- | ----------------------------------- |
| POST        | `/api/auth/register` | `{name,email,password}`             |
| POST        | `/api/auth/login`    | `{email,password}`                  |
| GET         | `/api/auth/me`       | Thông tin tài khoản                 |
| POST        | `/api/auth/logout`   | Thu hồi phiên hiện tại              |
| GET         | `/api/products`      | Danh sách của tài khoản             |
| POST        | `/api/products`      | `{name,sku,price,quantity}`         |
| PUT         | `/api/products/:id`  | Cập nhật toàn bộ thông tin sản phẩm |
| DELETE      | `/api/products/:id`  | Xóa sản phẩm                        |

Sau đăng nhập, gửi header `Authorization: Bearer <token>` cho các API được bảo vệ.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run build:web
```

Kiểm thử API dùng database tạm và kiểm tra đăng ký/đăng nhập, dữ liệu không hợp lệ, SKU trùng, cách ly tài khoản, CRUD, lưu dữ liệu và phiên qua lần mở lại database, cùng thu hồi token khi đăng xuất.
