import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createCatalog } from '../src/catalog/catalog.js';
import { createMemoryStockRepo } from '../src/inventory/stock-repo.js';
import { createClock } from '../src/lib/clock.js';

const catalog = createCatalog([
  { sku: 'TEE-BLK-M', name: '기본 티셔츠 블랙 M', backorderable: false },
  { sku: 'PRE-JKT-01', name: '[예약] 가을 자켓', backorderable: true },
]);
const clock = createClock(() => new Date('2026-03-01T06:00:00Z'));
const app = (levels) => createApp({ repo: createMemoryStockRepo(levels), catalog, clock });

test('일일 리포트는 날짜 머리글과 SKU순 줄', async () => {
  const report = await app({ 'TEE-BLK-M': 4, 'PRE-JKT-01': -3 }).reports.daily();
  assert.deepEqual(report.split('\n'), ['# 재고 2026-03-01', 'PRE-JKT-01\t-3', 'TEE-BLK-M\t4']);
});
