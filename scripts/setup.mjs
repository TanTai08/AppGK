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
    "Giữ nguyên .env hiện tại. Nếu còn API SQLite cũ, thay nội dung bằng .env.example.",
  );
console.log(
  "Điền cấu hình Firebase trong .env theo README. Không cần chạy backend Node/SQLite.",
);
console.log(
  "Web: npm.cmd run web | Android: npx.cmd expo start --android --localhost --clear",
);
