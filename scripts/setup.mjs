import { copyFileSync, existsSync } from "node:fs";
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Vui lòng cài Node.js 24 LTS.");
  process.exit(1);
}
if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Đã tạo .env.");
} else
  console.log(
    "Giữ nguyên .env hiện tại. Các biến FIREBASE không trống sẽ ghi đè cấu hình mặc định.",
  );
console.log(
  "Đã có cấu hình công khai Firebase appgk-73564 và UID admin trong mã nguồn. Publish database/database.rules.json trong Firebase Console và import database/products.json nếu chưa có dữ liệu. Không cần backend Node/SQLite.",
);
console.log(
  "Web: npm.cmd run web | Android: npx.cmd expo start --android --localhost --clear",
);
