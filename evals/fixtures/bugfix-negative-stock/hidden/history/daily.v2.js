// 일일 재고 리포트. SKU순.
export async function dailyStockReport({ repo, clock }) {
  const lines = (await repo.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sku, qty]) => `${sku}\t${qty}`);
  return [`# 재고 ${clock.now().toISOString().slice(0, 10)}`, ...lines].join('\n');
}
