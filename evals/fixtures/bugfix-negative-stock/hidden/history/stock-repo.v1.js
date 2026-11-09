// SKU별 재고. 운영 저장소로 옮기기 전까지 메모리에 둔다.
export function createMemoryStockRepo(initial = {}) {
  const levels = new Map(Object.entries(initial));
  return {
    get(sku) {
      return levels.get(sku) ?? 0;
    },
    adjust(sku, delta) {
      const next = (levels.get(sku) ?? 0) + delta;
      levels.set(sku, next);
      return next;
    },
    set(sku, qty) {
      levels.set(sku, qty);
    },
    entries() {
      return [...levels.entries()];
    },
  };
}
