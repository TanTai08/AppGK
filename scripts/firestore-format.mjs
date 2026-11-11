import { productData } from "../src/product.mjs";
const FIELDS = ["image", "name", "price", "soluong"];
export function importRecords(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error('JSON phải là object có dạng {"products":{"sp01":{...}}}.');
  const records = Object.hasOwn(input, "products") ? input.products : input;
  if (records === null) return [];
  if (!records || typeof records !== "object" || Array.isArray(records))
    throw new Error("products phải là object chứa các sản phẩm theo khóa.");
  return Object.entries(records).map(([key, value]) => {
    if (
      !key ||
      key.includes("/") ||
      key === "." ||
      key === ".." ||
      /^__.*__$/.test(key) ||
      Buffer.byteLength(key, "utf8") > 1500
    )
      throw new Error(`Document ID không hợp lệ: ${key}`);
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== FIELDS.join(",")
    )
      throw new Error(
        `${key}: mỗi sản phẩm phải có đúng name, price, soluong, image.`,
      );
    try {
      return { key, data: productData(value) };
    } catch (error) {
      throw new Error(`${key}: ${error.message}`);
    }
  });
}
