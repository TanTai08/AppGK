import { readFile, writeFile } from "node:fs/promises";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  runTransaction,
  terminate,
} from "firebase/firestore";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { importRecords } from "./firestore-format.mjs";

const action = process.argv[2];
const args = process.argv.slice(3);
if (
  !["import", "export"].includes(action) ||
  args.some(
    (v) => v.startsWith("--") && !["--apply", "--overwrite"].includes(v),
  )
) {
  console.error(
    "Dùng: npm run db:import -- [file.json] [--apply] [--overwrite]\nHoặc: npm run db:export -- [products-final.json]",
  );
  process.exit(1);
}
const path =
  args.find((v) => !v.startsWith("--")) ||
  (action === "import" ? "database/products.json" : "products-final.json");
const overwrite = args.includes("--overwrite");
let app, auth, db;
async function login() {
  const defaults = JSON.parse(
    await readFile(
      new URL("../src/firebase.config.json", import.meta.url),
      "utf8",
    ),
  );
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() || defaults.apiKey,
    authDomain:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
      defaults.authDomain,
    projectId:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() || defaults.projectId,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() || defaults.appId,
  };
  const adminUid =
    process.env.EXPO_PUBLIC_FIREBASE_ADMIN_UID?.trim() || defaults.adminUid;
  console.log(
    `Dự án đích: ${config.projectId} / Firestore (default) / products`,
  );
  if (!process.stdin.isTTY)
    throw new Error(
      "Chạy trong Terminal tương tác để nhập email/mật khẩu admin. Không đặt mật khẩu trong mã nguồn.",
    );
  let hidden = false;
  const output = new Writable({
    write(chunk, encoding, next) {
      if (!hidden) process.stdout.write(chunk, encoding);
      next();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  let email, password;
  try {
    email = (await rl.question("Email admin: ")).trim();
    process.stdout.write("Mật khẩu admin (ẩn khi nhập): ");
    hidden = true;
    password = await rl.question("");
  } finally {
    hidden = false;
    rl.close();
    process.stdout.write("\n");
  }
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  password = "";
  if (credential.user.uid !== adminUid)
    throw new Error("Tài khoản đăng nhập không trùng UID admin đã cấu hình.");
}
try {
  if (action === "import") {
    const records = importRecords(JSON.parse(await readFile(path, "utf8")));
    console.log(
      `Đã kiểm tra ${records.length} sản phẩm trong ${path}; mỗi bản ghi đúng bốn trường.`,
    );
    if (!args.includes("--apply"))
      console.log(
        'Chưa ghi dữ liệu. Để nhập: npm.cmd run db:import -- "' +
          path +
          '" --apply\nMặc định bỏ qua ID đã tồn tại. Chỉ thêm --overwrite khi muốn thay thế những ID đó.',
      );
    else if (records.length) {
      await login();
      const counts = { created: 0, updated: 0, skipped: 0 };
      for (const { key, data } of records) {
        const result = await runTransaction(db, async (transaction) => {
          const target = doc(db, "products", key);
          const current = await transaction.get(target);
          if (current.exists() && !overwrite) return "skipped";
          transaction.set(target, data);
          return current.exists() ? "updated" : "created";
        });
        counts[result]++;
        console.log(`${key}: ${result}`);
      }
      console.log(
        `Hoàn tất: thêm ${counts.created}, ghi đè ${counts.updated}, bỏ qua ${counts.skipped}.`,
      );
    }
  } else {
    await login();
    const snapshot = await getDocs(collection(db, "products"));
    const records = Object.fromEntries(
      snapshot.docs.map((item) => [item.id, item.data()]),
    );
    importRecords({ products: records }); // Reject malformed documents instead of silently dropping fields.
    await writeFile(
      path,
      JSON.stringify({ products: records }, null, 2) + "\n",
      { flag: overwrite ? "w" : "wx" },
    );
    console.log(`Đã xuất ${snapshot.size} sản phẩm (kèm ảnh) vào ${path}.`);
  }
} catch (error) {
  console.error(
    "Không hoàn tất:",
    error.code === "EEXIST"
      ? "File xuất đã tồn tại. Chọn tên khác hoặc dùng --overwrite."
      : error.message,
  );
  if (action === "import" && args.includes("--apply"))
    console.error(
      "Một số sản phẩm trước đó có thể đã được nhập. Chạy lại với chế độ bỏ qua ID tồn tại để tiếp tục.",
    );
  process.exitCode = 1;
} finally {
  if (auth) await signOut(auth).catch(() => {});
  if (db) await terminate(db).catch(() => {});
  if (app) await deleteApp(app).catch(() => {});
}
