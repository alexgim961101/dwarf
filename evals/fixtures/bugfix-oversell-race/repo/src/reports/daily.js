// 일일 재고 리포트. SKU 이름순.
export function dailyStockReport(stock, date = new Date()) {
  const lines = stock
    .entries()
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sku, qty]) => `${sku}\t${qty}`);
  return [`# 재고 ${date.toISOString().slice(0, 10)}`, ...lines].join('\n');
}
