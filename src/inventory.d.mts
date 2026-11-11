import type { ProductData } from "./product.mjs";
export type StockFilter = "all" | "available" | "low" | "out";
export type InventorySort =
  "default" | "name" | "priceAsc" | "priceDesc" | "stockAsc";
export const LOW_STOCK: number;
export function normalizeSearch(value: string): string;
export function inventoryStats(products: ProductData[]): {
  count: number;
  quantity: number;
  value: number;
  low: number;
  out: number;
};
export function inventoryView<T extends ProductData>(
  products: T[],
  search?: string,
  filter?: StockFilter,
  sort?: InventorySort,
): T[];
