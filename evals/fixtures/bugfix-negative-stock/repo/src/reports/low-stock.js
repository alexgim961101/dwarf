// 부족 재고. 임계치 이하인 일반 상품만. 예약 주문 상품은 음수가 정상이라 뺀다.
export async function lowStockReport({ repo, catalog }, { threshold = 5 } = {}) {
  const levels = new Map(await repo.entries());
  return catalog
    .all()
    .filter((item) => !item.backorderable)
    .map((item) => ({ sku: item.sku, name: item.name, qty: levels.get(item.sku) ?? 0 }))
    .filter((row) => row.qty <= threshold)
    .sort((a, b) => a.qty - b.qty || a.sku.localeCompare(b.sku));
}
