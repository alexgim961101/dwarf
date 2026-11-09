import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createCatalog } from '../src/catalog/catalog.js';
import { createMemoryStockRepo } from '../src/inventory/stock-repo.js';
import { createFakePricing, createFakeRefunds } from '../src/dev/fakes.js';

const catalog = createCatalog([
  { sku: 'TEE-BLK-M', name: '기본 티셔츠 블랙 M', backorderable: false },
  { sku: 'PRE-JKT-01', name: '[예약] 가을 자켓', backorderable: true },
]);
const prices = { 'TEE-BLK-M': 12000, 'PRE-JKT-01': 89000 };

const setup = (levels = { 'TEE-BLK-M': 3, 'PRE-JKT-01': 0 }) => {
  const repo = createMemoryStockRepo(levels);
  const refunds = createFakeRefunds();
  const app = createApp({ repo, catalog, pricing: createFakePricing({ prices }), refunds });
  return { repo, refunds, reservations: app.reservations };
};

test('예약하면 재고가 줄고 가격이 붙는다', async () => {
  const { repo, reservations } = setup();
  const r = await reservations.reserve('TEE-BLK-M', 2, 'c-1');
  assert.equal(await repo.get('TEE-BLK-M'), 1);
  assert.equal(r.price, 24000);
  assert.equal(r.status, 'active');
});

test('재고보다 많이 예약하면 거절한다', async () => {
  const { reservations } = setup({ 'TEE-BLK-M': 1 });
  await assert.rejects(reservations.reserve('TEE-BLK-M', 2, 'c-1'), { code: 'INSUFFICIENT_STOCK' });
});

test('예약 주문 상품은 재고가 없어도 예약되고 재고가 음수가 된다', async () => {
  const { repo, reservations } = setup({ 'PRE-JKT-01': 1 });
  await reservations.reserve('PRE-JKT-01', 3, 'c-1');
  assert.equal(await repo.get('PRE-JKT-01'), -2);
});

test('카탈로그에 없는 SKU와 잘못된 수량은 거절한다', async () => {
  const { reservations } = setup();
  await assert.rejects(reservations.reserve('NOPE', 1, 'c-1'), { code: 'UNKNOWN_SKU' });
  await assert.rejects(reservations.reserve('TEE-BLK-M', 0, 'c-1'), { code: 'INVALID_QUANTITY' });
  await assert.rejects(reservations.reserve('TEE-BLK-M', 1.5, 'c-1'), { code: 'INVALID_QUANTITY' });
});

test('취소하면 환불하고 재고를 돌려놓는다', async () => {
  const { repo, refunds, reservations } = setup();
  const r = await reservations.reserve('TEE-BLK-M', 1, 'c-1');
  const cancelled = await reservations.cancel(r.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(await repo.get('TEE-BLK-M'), 3);
  assert.equal(refunds.issued.length, 1);
  assert.equal(refunds.issued[0].amount, 12000);
  assert.equal(refunds.issued[0].customerId, 'c-1');
});

test('이미 취소한 예약은 다시 취소해도 그대로', async () => {
  const { refunds, reservations } = setup();
  const r = await reservations.reserve('TEE-BLK-M', 1, 'c-1');
  await reservations.cancel(r.id);
  await reservations.cancel(r.id);
  assert.equal(refunds.issued.length, 1);
});

test('확정한 예약은 취소되지 않고 다시 확정할 수 없다', async () => {
  const { repo, refunds, reservations } = setup();
  const r = await reservations.reserve('TEE-BLK-M', 1, 'c-1');
  await reservations.confirm(r.id);
  const same = await reservations.cancel(r.id);
  assert.equal(same.status, 'confirmed');
  assert.equal(await repo.get('TEE-BLK-M'), 2);
  assert.equal(refunds.issued.length, 0);
  await assert.rejects(reservations.confirm(r.id), { code: 'RESERVATION_NOT_ACTIVE' });
});

test('없는 예약은 찾을 수 없다', async () => {
  const { reservations } = setup();
  await assert.rejects(reservations.cancel('rsv_nope'), { code: 'RESERVATION_NOT_FOUND' });
  assert.equal(reservations.get('rsv_nope'), undefined);
});
