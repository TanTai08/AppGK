# AppGK — Quản trị sản phẩm với Cloud Firestore

Ứng dụng **React Native + Expo + TypeScript**, chạy web và Android/iOS. Đăng nhập bằng **Firebase Authentication**, lưu sản phẩm trên **Cloud Firestore (database `(default)`)**.

Mỗi sản phẩm chỉ có đúng **`name`, `price`, `soluong`, `image`**. Document ID là khóa ngoài bản ghi; không thêm `id`, `key`, SKU, ngày tạo hay trường thống kê vào dữ liệu.

## 1. Thiết lập Firestore trên Firebase Console

Dự án hiện tại: **appgk-73564**. Cấu hình SDK đã có trong `src/firebase.config.json`; không cần tạo dự án mới. Tài khoản admin giữ nguyên UID **5PVhYz6bvvNL5tNsID3gaFwnIwW2**.

1. Mở https://console.firebase.google.com → chọn **AppGK**.
2. Chọn **Databases & Storage → Firestore Database**. Nếu chưa có, bấm **Create database** → chọn **Standard edition**, database ID **`(default)`**, khu vực phù hợp → bắt đầu **Production mode**. Nếu đã thấy tab Data và nút Start collection thì database đã được tạo.
3. Vào tab **Rules** của **Firestore**. Sao chép toàn bộ file **`database/firestore.rules`** trong repo, dán vào và nhấn **Publish**. Không dán file JSON Rules cũ của Realtime Database vào đây.
4. Vào **Authentication → Sign-in method** và kiểm tra **Email/Password = Enabled**. Trong **Users**, giữ tài khoản có UID admin trên. Dùng email/password của chính tài khoản đó khi chạy app hoặc nhập dữ liệu. Người đăng ký mới không tự được cấp quyền quản trị.
5. Trong Firestore → **Indexes → Single field**, thêm exemption cho collection group **`products`**, field **`image`**, tắt toàn bộ index của trường này. Tìm kiếm/sắp xếp hiện tính trên giao diện, không cần đánh chỉ mục chuỗi ảnh. Cấu hình tương đương có trong `database/firestore.indexes.json`.
6. Nếu dùng web, kiểm tra Authentication → Settings → Authorized domains có `localhost`.

Không cần bấm Start collection nếu sẽ dùng công cụ nhập JSON ở mục 3: công cụ tự tạo collection/document. Nếu tạo bằng tay, dùng collection **products**; mỗi document nhập `name` kiểu string, `price` và `soluong` kiểu number (số lượng nguyên), `image` là chuỗi data URI đầy đủ. Với ảnh base64, dùng công cụ nhập sẽ thuận tiện hơn.

> Đẩy mã lên GitHub không tự Publish Firestore Rules, tạo database hoặc chép dữ liệu. Các bước Console phải thực hiện trong tài khoản Firebase của bạn. Bản chuyển đổi không xóa hay sửa dữ liệu Realtime Database cũ.

## 2. Cập nhật mã và chạy ứng dụng

Cần **Node.js 24 LTS**, Git, VS Code. Trong PowerShell, mở thư mục có `package.json` (ví dụ `D:\AppGK\AppGK`):

```powershell
cd D:\AppGK\AppGK
git pull
npm.cmd install
npm.cmd run setup
```

Nếu chưa tải repo:

```powershell
git clone https://github.com/TanTai08/AppGK.git
cd AppGK
code .
npm.cmd install
```

Không clone lại vào thư mục đã tồn tại. `npm.cmd` và `npx.cmd` tránh lỗi PowerShell chặn `npm.ps1`.

**Web:**

```powershell
npm.cmd run web
```

Mở địa chỉ Expo hiển thị, thường là `http://localhost:8081`. Đăng nhập bằng tài khoản admin, thử thêm sản phẩm có ảnh, sửa và xóa.

**Pixel 7 Android:**

1. Android Studio → Device Manager → khởi động Pixel 7 (API 35 hoặc máy ảo tương thích).
2. SDK Manager phải có Platform-Tools/Emulator; cấu hình `ANDROID_HOME` và `Path` nếu `adb devices` chưa nhận thiết bị.
3. Chạy:

```powershell
npx.cmd expo start --android --localhost --clear
```

Chọn **Y** nếu được hỏi cài Expo Go phù hợp SDK 54. Kéo một ảnh JPG/PNG nhỏ vào máy ảo hoặc tải ảnh vào Downloads, rồi chọn ảnh trong form sản phẩm. Web và Android cần Internet để truy cập Firestore thật.

Không cần server Node/SQLite, địa chỉ `10.0.2.2:3001` hoặc Realtime Database URL. `EXPO_PUBLIC_FIREBASE_DATABASE_URL` cũ không còn được sử dụng. iOS simulator cần macOS/Xcode và `npm run ios`.

### Dùng dự án Firebase khác

Các giá trị không trống trong `.env` sẽ ghi đè mặc định:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=apiKey
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=authDomain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=projectId
EXPO_PUBLIC_FIREBASE_APP_ID=appId
EXPO_PUBLIC_FIREBASE_ADMIN_UID=UID_admin
```

UID trong `.env` và `database/firestore.rules` phải cùng một tài khoản. Khởi động lại Expo với `--clear` sau khi đổi cấu hình. Không đưa mật khẩu hoặc service-account private key vào mã nguồn; công cụ nhập/xuất dùng đăng nhập email/password qua SDK và tuân thủ Rules.

## 3. Nhập dữ liệu JSON vào Firestore

Firestore Console **không nhập trực tiếp file JSON tùy ý như Realtime Database**. Repo có công cụ nhập đúng collection và đủ bốn trường.

### Nhập file mẫu của bài tập

**Kiểm tra file trước, chưa ghi dữ liệu:**

```powershell
npm.cmd run db:import
```

**Ghi vào Firestore sau khi đã Publish Rules:**

```powershell
npm.cmd run db:import -- database/products.json --apply
```

Terminal sẽ hỏi **email admin** và **mật khẩu**. Mật khẩu được ẩn khi nhập; không gửi mật khẩu trong chat hoặc đặt trong code. Nếu tài khoản không trùng UID admin, thao tác dừng.

Công cụ tạo các document `sp01`, `sp02`, `sp03` trong collection `products`, mỗi document có đủ tên, giá, số lượng và ảnh nhúng. Mặc định **bỏ qua ID đã tồn tại**, không xóa document khác. Có thể chạy lại để tiếp tục nếu kết nối bị gián đoạn.

Chỉ khi muốn thay thế toàn bộ bốn trường của những ID trong file:

```powershell
npm.cmd run db:import -- database/products.json --apply --overwrite
```

### Chuyển sản phẩm thật từ Realtime Database cũ

1. Firebase Console → **Realtime Database → Data** → menu tại node gốc → **Export JSON**.
2. Lưu file, ví dụ `realtime-export.json`, vào thư mục dự án. Giữ bản này làm bản sao dữ liệu cũ.
3. Kiểm tra rồi nhập:

```powershell
npm.cmd run db:import -- realtime-export.json
npm.cmd run db:import -- realtime-export.json --apply
```

Hỗ trợ cả file xuất node gốc dạng `{ "products": { ... } }` và file xuất riêng node products dạng `{ "sp01": { ... } }`. Công cụ giữ nguyên khóa cũ làm Document ID, giữ nguyên ảnh, và kiểm tra **toàn bộ file** trước khi ghi. Nếu có trường thừa/thiếu hoặc ID không hợp lệ, phải sửa dữ liệu trước.

Sau đó vào **Firestore → Data → products**, kiểm tra document. Thử CRUD trên web/Android. Không xóa Realtime Database trước khi đã đối chiếu dữ liệu mới.

## 4. Xuất file cơ sở dữ liệu để nộp bài

Chạy trong terminal riêng, không cần dừng Expo:

```powershell
npm.cmd run db:export
```

Nhập email/password admin. Công cụ xuất collection `products` ra **`products-final.json`** tại thư mục hiện tại, gồm ảnh base64 đầy đủ. Mặc định từ chối ghi đè file đã có. Chọn tên khác:

```powershell
npm.cmd run db:export -- products-nop-bai.json
```

Hoặc chủ động cho phép thay thế file cũ:

```powershell
npm.cmd run db:export -- products-final.json --overwrite
```

Nộp file JSON mới nhất cùng báo cáo và link https://github.com/TanTai08/AppGK. File mẫu `database/products.json` vẫn dùng được để import/nộp nếu bài trình diễn dùng đúng dữ liệu mẫu.

**Ảnh bằng chứng:** Firestore → Data → collection products → chọn một document, chụp rõ đúng bốn trường; có thể thu gọn chuỗi `image` dài. Chụp thêm giao diện web và Pixel 7 sau khi chọn/lưu ảnh. Không có ảnh Console giả trong repo. Báo cáo Word cũ dùng Realtime Database cần đổi mô tả/ảnh sang Firestore trước khi nộp.

## 5. Cấu trúc và quy tắc dữ liệu

```text
products (collection)
├── sp01 (document ID, không phải trường)
│   ├── name: "Cà phê rang"
│   ├── price: 85000
│   ├── soluong: 20
│   └── image: "data:image/png;base64,..."
├── sp02
└── sp03
```

Dấu `...` chỉ để minh họa. File JSON thật trong repo có ảnh base64 đầy đủ. `src/product.mjs` kiểm tra và chọn đúng bốn trường trước khi ghi; `database/firestore.rules` bắt buộc đủ bốn trường và chặn trường thứ năm. Document ID chỉ dùng làm `key` trên giao diện, không được ghi vào document.

- `name`: chuỗi 1–120 ký tự sau khi trim.
- `price`: số không âm, tối đa 10^12; form cho tối đa 2 chữ số thập phân.
- `soluong`: số nguyên không âm, tối đa 10^9.
- `image`: data URI JPG/PNG/WebP, ảnh chọn dưới 700 KB; Rules giới hạn chuỗi 1.000.000 ký tự, phù hợp giới hạn document Firestore 1 MiB.

Ảnh nhúng giúp file JSON có đủ ảnh để nộp mà không cần Storage. Cách này phù hợp bài tập nhỏ; không tối ưu cho kho lớn vì danh sách tải cả ảnh. Tài khoản nằm ở Firebase Authentication, không thêm document users/role vào cơ sở dữ liệu sản phẩm.

## 6. Chức năng ứng dụng

- Đăng ký/đăng nhập/đăng xuất. Chỉ UID admin có quyền xem và thao tác sản phẩm.
- Thêm, sửa, xóa có xác nhận; chọn và xem trước ảnh trên web/di động.
- `onSnapshot` nhận thay đổi Firestore, tự cập nhật giao diện và thống kê.
- Tìm tên tiếng Việt có/không dấu; lọc còn hàng (>0), sắp hết (1–5), hết hàng (0).
- Sắp xếp tên A–Z, giá tăng/giảm, tồn kho ít trước. Thứ tự mặc định dựa trên Document ID, không biểu thị ngày tạo vì đề không có trường thời gian.
- Thống kê số mặt hàng, tổng đơn vị tồn kho, tổng `price × soluong`, số mặt hàng cần bổ sung. Thống kê tính trên toàn kho, độc lập bộ lọc.

Tìm kiếm, bộ lọc và thống kê chỉ nằm trong bộ nhớ, không thêm trường hoặc collection phụ vào Firestore.

## 7. File và thư viện liên quan

```text
App.tsx                       Giao diện đăng nhập, admin và ImagePicker
src/firebase.ts               Firebase Auth + Cloud Firestore
src/firebase.config.json      Cấu hình công khai và UID admin
src/store.tsx                 onSnapshot, addDoc, setDoc, deleteDoc
src/product.mjs / .d.mts       Kiểm tra và khai báo kiểu bốn trường
src/inventory.mjs / .d.mts     Tìm kiếm, lọc, sắp xếp, thống kê
scripts/firestore-data.mjs     Đăng nhập terminal, nhập/xuất JSON
scripts/firestore-format.mjs   Kiểm tra file migration trước khi ghi
scripts/setup.mjs             Tạo .env tùy chọn và hướng dẫn
database/products.json        File CSDL mẫu có ảnh (thư mục database)
database/firestore.rules      Quyền admin và schema Firestore
database/firestore.indexes.json Miễn lập chỉ mục trường ảnh
firebase.json                 Firestore CLI/emulator configuration
tests/                        Unit tests và Firestore Rules tests
```

Thư viện: React, React Native, React Native Web, React DOM, Expo SDK 54, `expo-image-picker`, `expo-status-bar`, `firebase`, TypeScript. Không cần cài `firebase-admin`, service account hoặc server riêng.

## 8. Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:web
npx.cmd expo export --platform android --output-dir android-export
```

Unit tests kiểm tra schema bốn trường, ảnh nhúng, migration JSON, tìm kiếm/bộ lọc và tính thống kê. Không ghi vào Firebase thật.

**Kiểm thử Rules với Firestore Emulator** (cần Java 21+; không cần tài khoản Firebase thật):

```powershell
npx.cmd firebase-tools emulators:exec --project demo-appgk --only firestore "node --test tests/firebase-rules.test.mjs"
```

Test dùng endpoint cục bộ cố định và namespace `demo-appgk`: admin CRUD, ảnh đọc lại, chặn khách/người khác, chặn trường thừa/thiếu, số âm/số lượng lẻ và đường dẫn ngoài products. `npm test` bỏ qua bài này khi không có emulator. Emulator không được kết nối trong ứng dụng production.

## 9. Lỗi thường gặp

| Lỗi                                  | Cách xử lý                                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Permission denied                    | Publish file **firestore.rules** vào tab Rules của Firestore, dùng đúng UID admin. Rules RTDB cũ không áp dụng. |
| Database not found / API not enabled | Tạo Firestore Native/Standard database `(default)` trong đúng dự án, chờ provisioning hoàn tất.                 |
| Không thấy dữ liệu RTDB cũ           | Dữ liệu không tự chuyển. Export JSON ở RTDB, rồi chạy db:import theo mục 3.                                     |
| CLI chỉ kiểm tra, chưa nhập          | Thêm `--apply` sau dấu `--` của npm.                                                                            |
| Sản phẩm đã tồn tại bị bỏ qua        | Đây là mặc định bảo toàn dữ liệu. Chỉ dùng `--overwrite` nếu muốn thay thế các ID trong file.                   |
| Mật khẩu nhập không hiện ký tự       | Đây là chế độ ẩn mật khẩu; nhập xong nhấn Enter.                                                                |
| Tài khoản chưa có quyền admin        | Đối chiếu UID Authentication, config/.env và Firestore Rules; khởi động lại Expo.                               |
| tsconfig bị đỏ                       | npm.cmd install, mở đúng thư mục package.json, Use Workspace TypeScript rồi Restart TS Server.                  |
| Ảnh quá lớn                          | Chọn ảnh nhỏ hơn 700 KB; document Firestore tối đa 1 MiB.                                                       |
| Đổi config nhưng chưa nhận           | Dừng Expo, chạy lại với --clear.                                                                                |
