# AppGK — Phân hệ admin sản phẩm

React Native + Expo + TypeScript, chạy web và Android/iOS. Cơ sở dữ liệu **Firebase Realtime Database**; đăng nhập/đăng ký dùng **Firebase Authentication**. Đây là lựa chọn React Native trong đề, không phải dự án .NET MAUI.

## Cấu hình dự án hiện tại

Mã nguồn đã có cấu hình SDK công khai của dự án **appgk-73564** trong `src/firebase.config.json` và UID admin **5PVhYz6bvvNL5tNsID3gaFwnIwW2**. Không cần nhập lại `.env` để dùng dự án này. `.env` là tùy chọn ghi đè cấu hình; file cá nhân này không đưa lên GitHub. Mã nguồn không chứa mật khẩu hoặc khóa service account.

Sau khi tải/cập nhật repo:

```powershell
npm.cmd install
npm.cmd run setup
npm.cmd run web
```

Pixel 7: `npx.cmd expo start --android --localhost --clear`.

Trên Firebase Console, cần bật Email/Password (bạn đã bật), giữ tài khoản có UID trên, **Publish nội dung `database/database.rules.json`** và **import `database/products.json` ở node gốc nếu database chưa có dữ liệu**. Không import đè nếu muốn giữ dữ liệu sản phẩm đã nhập. Việc đẩy code GitHub không tự cập nhật Rules hoặc dữ liệu Firebase. Đăng nhập bằng email/password của tài khoản admin; người đăng ký mới không tự có quyền quản trị.

Nếu `.env` cũ chứa giá trị Firebase khác, xóa các giá trị ghi đè đó hoặc đổi sang cấu hình đúng, rồi khởi động lại Expo với `--clear`. Bản mới tự dùng cấu hình mặc định khi các biến trống.

Các phần dưới hướng dẫn tạo một dự án Firebase khác nếu cần. Khi đổi dự án, cập nhật cả config và UID trong Rules.

## Đáp ứng đề bài

| Yêu cầu                            | Thực hiện                                                     |
| ---------------------------------- | ------------------------------------------------------------- |
| Nhập và hiển thị sản phẩm trên web | Form + danh sách có tên, giá, số lượng, hình ảnh              |
| Firebase hoặc MongoDB              | Firebase Realtime Database                                    |
| Đăng nhập, sửa, xóa                | Email/password, sửa form, xác nhận xóa                        |
| Nhập và hiển thị ảnh trên di động  | Expo ImagePicker, React Native Image                          |
| Phân hệ admin                      | Database Rules chỉ cho UID quản trị được đọc/ghi              |
| File CSDL bắt buộc                 | `database/products.json`, chứa 3 sản phẩm và ảnh nhúng đầy đủ |
| Chỉ bốn trường                     | `name`, `price`, `soluong`, `image`                           |

Mỗi bản ghi có đúng bốn trường. `sp01` hoặc khóa do Firebase `push()` sinh ra là **khóa của node**, không phải thuộc tính của sản phẩm. Không có `id`, `sku`, `quantity`, `user_id`, thời gian tạo hoặc trường phụ trong bản ghi. Tài khoản nằm trong dịch vụ Authentication, không tạo bảng tài khoản trong database.

```json
{
  "products": {
    "sp01": {
      "name": "Cà phê rang",
      "price": 85000,
      "soluong": 20,
      "image": "data:image/png;base64,..."
    }
  }
}
```

Đoạn trên minh họa; file nộp `database/products.json` có dữ liệu ảnh base64 hoàn chỉnh, không có dấu `...`. Ảnh mẫu là minh họa tự tạo. Ảnh chọn từ máy/điện thoại được lưu dạng data URI, tối đa 700 KB, nên JSON xuất ra có luôn ảnh, không phụ thuộc Firebase Storage hay file trên máy. Cách này phù hợp bài tập nhỏ; tải toàn bộ danh sách/ảnh không phù hợp kho lớn.

## 1. Tạo Firebase (chỉ cần làm một lần)

1. Mở https://console.firebase.google.com → Create a project. Có thể tắt Google Analytics. Dùng gói Spark cho bài tập nhỏ.
2. Project settings → General → Your apps → chọn biểu tượng **Web `</>`**, đăng ký app. Sao chép các giá trị `firebaseConfig`.
3. Build → Authentication → Get started → Sign-in method → bật **Email/Password**.
4. Authentication → Users → Add user: tạo email/password quản trị (mật khẩu ít nhất 8 ký tự). Sao chép **User UID** của tài khoản này. Có thể đăng ký trong app rồi lấy UID, nhưng tạo trước trên Console dễ hơn.
5. Build → Realtime Database → Create database → chọn khu vực → bắt đầu **Locked mode**. Sao chép Database URL đúng của dự án (có thể kết thúc bằng `firebasedatabase.app` hoặc `firebaseio.com`). Không tạo Cloud Firestore thay cho Realtime Database.
6. Realtime Database → Data → ở node gốc chọn menu ⋮ → **Import JSON** → chọn `database/products.json`. Nhập ở node gốc để có đường dẫn `/products/sp01`, không tạo `/products/products`.
7. Mở `database/database.rules.json`. File đã có UID admin của AppGK; nếu dùng dự án/tài khoản khác, thay tất cả UID hiện tại bằng UID bước 4. Dán toàn bộ vào tab **Rules** của Realtime Database rồi **Publish**. Không để rules mở cho mọi người.
8. Authentication → Settings → Authorized domains: thêm `localhost` nếu chưa có để thử web.

Quyền admin được kiểm tra thật trên Firebase Rules, không chỉ ẩn nút giao diện. Người đăng ký mới đăng nhập được nhưng chưa có quyền đọc/ghi sản phẩm. Chỉ UID đã cấu hình trong rules mới được phép. Không cần thêm trường `role` vào sản phẩm hoặc node admin trong database.

## 2. Chạy trên VS Code / Windows

Cài Node.js **24 LTS**, Git, VS Code. Nếu chưa tải repo:

```powershell
git clone https://github.com/TanTai08/AppGK.git
cd AppGK
code .
```

Nếu đã có repo: mở đúng thư mục có `package.json`, chạy `git pull`; không clone lại vào thư mục đã tồn tại. Ví dụ cấu trúc lồng nhau trước đây dùng `cd D:\AppGK\AppGK`.

```powershell
npm.cmd install
npm.cmd run setup
```

Với dự án AppGK hiện tại không cần điền `.env`. Nếu dùng dự án khác, điền các giá trị ghi đè:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=gia_tri_apiKey
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=ten-du-an.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://URL_DATABASE_THUC_CUA_BAN
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ten-du-an
EXPO_PUBLIC_FIREBASE_APP_ID=gia_tri_appId
EXPO_PUBLIC_FIREBASE_ADMIN_UID=UID_tai_khoan_quan_tri
```

UID trong `.env` và hai vị trí trong Database Rules phải giống nhau. Đây là cấu hình SDK phía client; không đưa service-account private key hay mật khẩu quản trị vào `.env` hoặc Git. Không commit `.env` thật.

### Web (phần 8 điểm)

```powershell
npm.cmd run web
```

Mở địa chỉ Expo hiển thị (thường `http://localhost:8081`). Đăng nhập bằng tài khoản quản trị đã tạo. Thêm tên, giá, số lượng; bấm Chọn hình ảnh → chọn JPG/PNG/WebP nhỏ hơn 700 KB → Lưu. Sửa và xóa ở từng sản phẩm. Firebase `onValue` tự cập nhật danh sách trên các thiết bị đang mở.

### Android Pixel 7 (phần nhập ảnh trên di động)

1. Android Studio → Device Manager → tạo Pixel 7 (API 35) → nhấn ▶ và chờ khởi động.
2. Cấu hình `ANDROID_HOME` tới SDK, thêm `platform-tools` vào PATH nếu máy chưa nhận `adb`.
3. Chạy:

```powershell
npx.cmd expo start --android --localhost --clear
```

Chấp nhận **Y** nếu CLI hỏi cài Expo Go tương thích SDK 54. Mở ảnh trên máy ảo bằng cách kéo file JPG/PNG nhỏ vào máy ảo hoặc tải ảnh vào Downloads. Trong app: Thêm sản phẩm → Chọn hình ảnh → cấp quyền nếu được hỏi → chọn ảnh → Lưu. Xác nhận ảnh hiện trong danh sách; mở web để thấy cùng dữ liệu.

**Không cần `npm run server`, SQLite hay `10.0.2.2:3001` nữa.** Web/máy ảo cần Internet để kết nối Firebase. iOS dùng `npm run ios` trên macOS/Xcode.

## 3. Nộp bài và chụp bằng chứng

- Link source: https://github.com/TanTai08/AppGK
- File database bắt buộc: `database/products.json`. Sau khi nhập/sửa sản phẩm thật, nên nộp bản mới nhất: Firebase Console → Realtime Database → Data → menu ở node gốc → **Export JSON**, lưu thành `products-final.json`.
- Nộp thêm `database/database.rules.json` đã thay UID, và README mô tả cách chạy/thư viện.
- Ảnh CSDL: mở Console → Data → mở `/products/sp01` hoặc một khóa sản phẩm; chụp rõ tên database và đúng bốn trường. `image` là chuỗi base64 dài, có thể thu gọn để dễ nhìn.
- Chụp màn hình web có danh sách và ảnh; màn hình form thêm/sửa; màn hình đăng nhập.
- Chụp Pixel 7 khi chọn ảnh và sau khi lưu ảnh trong danh sách.
- Không chụp mật khẩu hoặc private key. File JSON không chứa tài khoản; tạo tài khoản lại trong Authentication khi chuyển dự án.

**Repo đã gắn cấu hình SDK và UID của dự án appgk-73564. Ảnh chụp CSDL thật vẫn cần chụp trong Console sau khi import dữ liệu; không có ảnh Console giả trong repo.** Chỉ import JSON chưa đủ: phải bật Authentication, cấu hình `.env` và Publish Rules.

## 4. Cấu trúc và thư viện

```text
App.tsx                      Giao diện đăng nhập/admin, chọn và hiển thị ảnh
src/firebase.ts              Khởi tạo Firebase từ .env
src/store.tsx                 Auth, subscription realtime, thêm/sửa/xóa
src/product.mjs               Kiểm tra và chọn đúng bốn trường trước khi ghi
src/product.d.mts             Kiểu dữ liệu cho TypeScript
scripts/setup.mjs             Tạo .env, hướng dẫn khởi động
tests/product.test.mjs        Kiểm tra schema JSON và payload (thư mục tests)
database/products.json        Dữ liệu mẫu đầy đủ để import/nộp
database/database.rules.json  Quyền admin, bắt buộc bốn trường
.vscode/tasks.json            Lệnh chạy nhanh web/Android
```

Thư viện chính: `react`, `react-native`, `react-native-web`, `react-dom`, `expo`, `expo-status-bar`, `expo-image-picker`, `firebase`. Công cụ phát triển: TypeScript, `@types/react`; `package-lock.json` khóa phiên bản cài đặt.

## 5. Kiểm tra và xử lý lỗi

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:web
npx.cmd expo export --platform android --output-dir android-export
```

Test tự động kiểm tra file JSON đủ bốn trường, ảnh nhúng hợp lệ, chặn số âm/trường thiếu/ảnh lớn và loại metadata trước khi ghi. Đây chưa thay thế kiểm thử Firebase thật: sau thiết lập, thử admin CRUD trên web/Android và tài khoản thường bị từ chối. Có thể dùng Rules Playground trong Console: giả lập UID admin và UID khác, kiểm tra đọc `/products` và ghi `/products/test`, thử payload có trường thứ năm phải bị từ chối.

| Lỗi                                     | Cách xử lý                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| PowerShell chặn npm.ps1                 | Dùng `npm.cmd`, `npx.cmd` như các lệnh trên.                                                                                     |
| `expo/tsconfig.base` đỏ                 | `npm.cmd install`, mở đúng thư mục có package.json, chọn TypeScript: Use Workspace Version rồi Restart TS Server.                |
| Màn hình Thiết lập Firebase             | Kiểm tra cấu hình mặc định trong src/firebase.config.json và các biến ghi đè trong `.env`; dừng Expo rồi chạy lại với `--clear`. |
| Tài khoản chưa có quyền admin           | So khớp UID trong Authentication, `.env` và Database Rules; khởi động lại Expo.                                                  |
| Permission denied                       | Publish đúng Rules vào đúng database/project, đăng nhập tài khoản admin.                                                         |
| Invalid API key / operation not allowed | Kiểm tra config Web app và bật Email/Password trong Authentication.                                                              |
| Không thấy ảnh trên Pixel 7             | Kéo ảnh vào emulator trước, cấp quyền thư viện ảnh, chọn JPG/PNG/WebP dưới 700 KB.                                               |
| Đổi .env nhưng chưa cập nhật            | Dừng Expo và chạy lại `npx.cmd expo start --clear`.                                                                              |
| Màn hình tối/không nhập được            | Nhấn Back một lần để đóng hộp thoại hệ thống; reload app. Các modal thêm/xóa chỉ được mount khi mở.                              |

### Kiểm thử Database Rules với emulator (tùy chọn)

Cần Java 21+. Không cần tạo tài khoản Firebase hay đăng nhập CLI:

```powershell
npx.cmd firebase-tools emulators:exec --project demo-appgk --only database "node --test tests/firebase-rules.test.mjs"
```

Bài test sử dụng namespace demo và token giả chỉ dành cho emulator chạy cục bộ; không gọi database thật. Test kiểm tra admin CRUD, từ chối khách/tài khoản khác, từ chối trường thứ năm/trường thiếu/số lượng âm. `npm test` mặc định bỏ qua bài test này nếu chưa có emulator. Không triển khai rules với UID thử nghiệm lên database thật.

Trên native, Firebase Auth hiện dùng bộ nhớ cho phiên; có thể cần đăng nhập lại khi đóng hoàn toàn ứng dụng. Bản web dùng cơ chế lưu phiên mặc định của Firebase.
