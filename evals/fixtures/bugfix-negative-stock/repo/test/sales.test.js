import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createCatalog } from '../src/catalog/catalog.js';
import { createMemoryStockRepo } from '../src/inventory/stock-repo.js';

const catalog = createCatalog([
  { sku: 'CAP-NVY', name: '볼캡 네이비', backorderable: false },
  { sku: 'PRE-JKT-01', name: '[예약] 가을 자켓', backorderable: true },
]);

const setup = (levels = { 'CAP-NVY': 2, 'PRE-JKT-01': 1 }) => {
  const repo = createMemoryStockRepo(levels);
  const app = createApp({ repo, catalog });
  return { repo, sales: app.sales };
};

test('판매하면 재고가 줄어든다', async () => {
  const { repo, sales } = setup();
  const sale = await sales.recordSale('CAP-NVY', 1, 'reg-1');
  assert.equal(sale.status, 'sold');
  assert.equal(await repo.get('CAP-NVY'), 1);
  assert.deepEqual(sales.list('reg-1').map((s) => s.id), [sale.id]);
});

test('재고보다 많이 팔 수 없다', async () => {
  const { sales } = setup();
  await assert.rejects(sales.recordSale('CAP-NVY', 3, 'reg-1'), { code: 'INSUFFICIENT_STOCK' });
});

test('예약 주문 상품도 매장에서는 실물 재고만큼만 판다', async () => {
  const { repo, sales } = setup();
  await sales.recordSale('PRE-JKT-01', 1, 'reg-1');
  await assert.rejects(sales.recordSale('PRE-JKT-01', 1, 'reg-1'), { code: 'INSUFFICIENT_STOCK' });
  assert.equal(await repo.get('PRE-JKT-01'), 0);
});

test('반품하면 재고가 돌아오고 두 번 반품해도 한 번만 돌아온다', async () => {
  const { repo, sales } = setup();
  const sale = await sales.recordSale('CAP-NVY', 2, 'reg-2');
  await sales.voidSale(sale.id);
  await sales.voidSale(sale.id);
  assert.equal(await repo.get('CAP-NVY'), 2);
  assert.equal(sales.list()[0].status, 'voided');
});

test('없는 판매는 반품할 수 없다', async () => {
  const { sales } = setup();
  await assert.rejects(sales.voidSale('sale_nope'), { code: 'SALE_NOT_FOUND' });
});
