// Read-only calculations: never add statistics or search fields to Firebase.
export const LOW_STOCK = 5;
export function normalizeSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}
export function inventoryStats(products) {
  return products.reduce(
    (stats, p) => ({
      count: stats.count + 1,
      quantity: stats.quantity + p.soluong,
      value: stats.value + p.price * p.soluong,
      low: stats.low + Number(p.soluong > 0 && p.soluong <= LOW_STOCK),
      out: stats.out + Number(p.soluong === 0),
    }),
    { count: 0, quantity: 0, value: 0, low: 0, out: 0 },
  );
}
export function inventoryView(
  products,
  search = "",
  filter = "all",
  sort = "default",
) {
  const words = normalizeSearch(search).split(/\s+/).filter(Boolean);
  const result = products.filter((p) => {
    const name = normalizeSearch(p.name);
    return (
      words.every((word) => name.includes(word)) &&
      (filter === "all" ||
        (filter === "available" && p.soluong > 0) ||
        (filter === "low" && p.soluong > 0 && p.soluong <= LOW_STOCK) ||
        (filter === "out" && p.soluong === 0))
    );
  });
  const compareName = (a, b) => a.name.localeCompare(b.name, "vi");
  if (sort === "name") result.sort(compareName);
  if (sort === "priceAsc")
    result.sort((a, b) => a.price - b.price || compareName(a, b));
  if (sort === "priceDesc")
    result.sort((a, b) => b.price - a.price || compareName(a, b));
  if (sort === "stockAsc")
    result.sort((a, b) => a.soluong - b.soluong || compareName(a, b));
  return result;
}
