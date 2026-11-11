import { copyFileSync, existsSync } from "node:fs";

if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Vui lòng cài Node.js 24 LTS rồi chạy lại npm run setup.");
  process.exit(1);
}
if (!existsSync("package.json") || !existsSync(".env.example")) {
  console.error("Chạy lệnh trong thư mục AppGK có file package.json.");
  process.exit(1);
}
if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log(
    "Đã tạo .env. Android emulator tự dùng API http://10.0.2.2:3001.",
  );
} else {
  console.log(
    "Giữ file .env hiện tại. Với Pixel 7 emulator, để EXPO_PUBLIC_API_URL trống hoặc đặt http://10.0.2.2:3001.",
  );
}
console.log("Terminal 1: npm run server");
console.log("Mở Pixel 7 trong Android Studio → Device Manager.");
console.log("Terminal 2: npm run android");
