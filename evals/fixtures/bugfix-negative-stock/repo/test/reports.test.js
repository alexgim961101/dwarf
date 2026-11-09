import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createCatalog } from '../src/catalog/catalog.js';
import { createMemoryStockRepo } from '../src/inventory/stock-repo.js';
import { createClock } from '../src/lib/clock.js';

const catalog = createCatalog([
  { sku: 'TEE-BLK-M', name: '기본 티셔츠 블랙 M', backorderable: false },
  { sku: 'CAP-NVY', name: '볼캡 네이비', backorderable: false },
  { sku: 'PRE-JKT-01', name: '[예약] 가을 자켓', backorderable: true },
]);
const clock = createClock(() => new Date('2026-03-01T06:00:00Z'));
const app = (levels) => createApp({ repo: createMemoryStockRepo(levels), catalog, clock });

test('일일 리포트는 날짜 머리글, 이름순 줄, 재고 0인 상품을 포함한다', async () => {
  const report = await app({ 'TEE-BLK-M': 4, 'PRE-JKT-01': -3 }).reports.daily();
  assert.deepEqual(report.split('\n'), [
    '# 재고 2026-03-01',
    'sku\tqty\tname',
    'PRE-JKT-01\t-3\t[예약] 가을 자켓',
    'TEE-BLK-M\t4\t기본 티셔츠 블랙 M',
    'CAP-NVY\t0\t볼캡 네이비',
  ]);
});

test('부족 재고 리포트는 일반 상품만 임계치 이하를 적은 순으로 낸다', async () => {
  const rows = await app({ 'TEE-BLK-M': 2, 'CAP-NVY': 7, 'PRE-JKT-01': -9 }).reports.lowStock({ threshold: 5 });
  assert.deepEqual(rows, [{ sku: 'TEE-BLK-M', name: '기본 티셔츠 블랙 M', qty: 2 }]);
});
