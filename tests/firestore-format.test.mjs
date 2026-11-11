import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importRecords } from "../scripts/firestore-format.mjs";
const file = JSON.parse(
  readFileSync(new URL("../database/products.json", import.meta.url), "utf8"),
);
test("migration accepts root or products-node RTDB exports and retains keys/images", () => {
  const full = importRecords(file);
  const node = importRecords(file.products);
  assert.deepEqual(full, node);
  assert.equal(full.length, 3);
  for (const { key, data } of full) {
    assert.deepEqual(data, file.products[key]);
    assert.equal(Object.keys(data).length, 4);
  }
  assert.deepEqual(importRecords({ products: {} }), []);
  assert.deepEqual(importRecords({ products: null }), []);
});
test("migration rejects malformed records and Firestore document IDs before any upload", () => {
  const sample = file.products.sp01;
  for (const value of [
    null,
    [],
    { products: [] },
    { products: { sp01: { ...sample, id: "bad" } } },
    { products: { sp01: { name: "missing fields" } } },
    { products: { "a/b": sample } },
    { products: { "..": sample } },
    { products: { __reserved__: sample } },
    { products: { ["a".repeat(1501)]: sample } },
  ])
    assert.throws(() => importRecords(value));
});
