import { test } from "node:test";
import assert from "node:assert/strict";
import { inventoryStats, inventoryView } from "../src/inventory.mjs";
const products = [
  { name: "Cà phê Đắk Lắk", price: 85000, soluong: 10, image: "coffee" },
  { name: "Bình giữ nhiệt", price: 150000, soluong: 3, image: "bottle" },
  { name: "Sổ tay", price: 35000, soluong: 0, image: "book" },
  { name: "Cà phê sữa", price: 25000, soluong: 5, image: "milk" },
];
test("statistics cover all products and distinguish low stock from out of stock", () => {
  assert.deepEqual(inventoryStats(products), {
    count: 4,
    quantity: 18,
    value: 1425000,
    low: 2,
    out: 1,
  });
  assert.deepEqual(inventoryStats([]), {
    count: 0,
    quantity: 0,
    value: 0,
    low: 0,
    out: 0,
  });
});
test("Vietnamese search supports accents, uppercase, Đ and multiple words", () => {
  assert.deepEqual(inventoryView(products, "  DAK   CA  "), [products[0]]);
  assert.deepEqual(inventoryView(products, "CÀ PHÊ"), [
    products[0],
    products[3],
  ]);
  assert.equal(inventoryView(products, "không tồn tại").length, 0);
});
test("combine search, stock filters and price sorting without modifying records or input order", () => {
  const before = JSON.stringify(products);
  assert.deepEqual(inventoryView(products, "", "out"), [products[2]]);
  assert.deepEqual(inventoryView(products, "", "available"), [
    products[0],
    products[1],
    products[3],
  ]);
  assert.deepEqual(inventoryView(products, "ca phe", "low", "priceAsc"), [
    products[3],
  ]);
  assert.deepEqual(inventoryView(products, "", "all", "priceDesc"), [
    products[1],
    products[0],
    products[2],
    products[3],
  ]);
  assert.deepEqual(inventoryView(products, "", "all", "stockAsc"), [
    products[2],
    products[1],
    products[3],
    products[0],
  ]);
  assert.equal(JSON.stringify(products), before);
});
