// SKU별 재고. 운영에서는 같은 인터페이스의 DB 어댑터를 쓴다.
export function createStockStore(initial = {}) {
  const levels = new Map(Object.entries(initial));
  return {
    get(sku) {
      return levels.get(sku) ?? 0;
    },
    adjust(sku, delta) {
      levels.set(sku, (levels.get(sku) ?? 0) + delta);
      return levels.get(sku);
    },
    entries() {
      return [...levels.entries()];
    },
  };
}
