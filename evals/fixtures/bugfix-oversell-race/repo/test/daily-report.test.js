import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStockStore } from '../src/inventory/stock-store.js';
import { dailyStockReport } from '../src/reports/daily.js';

test('SKU 이름순으로 재고를 적는다', () => {
  const report = dailyStockReport(createStockStore({ 'SKU-B': 2, 'SKU-A': 5 }), new Date('2026-11-01'));
  assert.equal(report, '# 재고 2026-11-01\nSKU-A\t5\nSKU-B\t2');
});
