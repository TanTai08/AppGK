import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { productData } from "../src/product.mjs";
const dump = JSON.parse(
  readFileSync(new URL("../database/products.json", import.meta.url)),
);
const sample = Object.values(dump.products)[0];
test("submission JSON contains exactly four required fields and embedded images", () => {
  assert.ok(Object.keys(dump.products).length >= 3);
  for (const value of Object.values(dump.products)) {
    assert.deepEqual(Object.keys(value).sort(), [
      "image",
      "name",
      "price",
      "soluong",
    ]);
    assert.deepEqual(productData(value), value);
    const image = Buffer.from(value.image.split(",")[1], "base64");
    assert.equal(image.subarray(1, 4).toString(), "PNG");
  }
});
test("write payload strips UI metadata and any extra field", () => {
  assert.deepEqual(
    productData({
      ...sample,
      key: "sp01",
      sku: "legacy",
      quantity: 1,
      user_id: "old",
    }),
    sample,
  );
});
test("reject invalid or missing required product information", () => {
  for (const invalid of [
    { name: "" },
    { price: -1 },
    { price: NaN },
    { soluong: 1.5 },
    { soluong: -2 },
    { image: "" },
    { image: "file:///local.png" },
    { image: "data:image/png;base64," + "A".repeat(1000001) },
  ]) {
    assert.throws(() => productData({ ...sample, ...invalid }));
  }
  for (const key of ["name", "price", "soluong", "image"]) {
    const value = { ...sample };
    delete value[key];
    assert.throws(() => productData(value));
  }
});
