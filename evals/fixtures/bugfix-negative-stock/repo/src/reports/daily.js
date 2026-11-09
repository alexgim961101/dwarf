// 일일 재고 리포트. 카탈로그의 모든 상품을 이름순으로, 재고 0인 상품도 함께.
export async function dailyStockReport({ repo, catalog, clock }) {
  const levels = new Map(await repo.entries());
  const lines = catalog
    .all()
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map((item) => `${item.sku}\t${levels.get(item.sku) ?? 0}\t${item.name}`);
  return [`# 재고 ${clock.now().toISOString().slice(0, 10)}`, 'sku\tqty\tname', ...lines].join('\n');
}
