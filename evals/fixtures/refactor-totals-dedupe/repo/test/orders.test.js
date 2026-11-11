import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { fixedClock } from '../src/lib/clock.js';

const NOW = '2026-10-12T03:00:00.000Z';
const items = [{ sku: 'NB-A5-80', qty: 10 }, { sku: 'BK-WKB-3', qty: 2 }];

test('주문을 접수하면 금액을 계산해 저장한다', async () => {
  const { orders } = createApp({ clock: fixedClock(NOW) });
  const order = await orders.place({ customer: 'C-1', region: 'seoul', items });
  assert.equal(order.id, 'ORD-0001');
  assert.equal(order.placedAt, NOW);
  assert.deepEqual(order.totals, { subtotal: 31950, discount: 0, shipping: 3000, tax: 1235, total: 36185 });
  assert.deepEqual(await orders.get('ORD-0001'), order);
});

test('정액 쿠폰은 과세·면세 금액 비율대로 세액을 줄인다', async () => {
  const { orders } = createApp({ clock: fixedClock(NOW) });
  const order = await orders.place({ customer: 'C-1', region: 'seoul', items, couponCode: 'SAVE5000' });
  assert.deepEqual(order.totals, { subtotal: 31950, discount: 5000, shipping: 3000, tax: 1042, total: 30992 });
});

test('없는 주문·상품·쿠폰은 오류다', async () => {
  const { orders } = createApp();
  await assert.rejects(orders.get('ORD-9999'), { code: 'ORDER_NOT_FOUND' });
  await assert.rejects(orders.place({ customer: 'C-1', items: [{ sku: 'NOPE', qty: 1 }] }), { code: 'UNKNOWN_SKU' });
  await assert.rejects(orders.place({ customer: 'C-1', items, couponCode: 'NOPE' }), { code: 'UNKNOWN_COUPON' });
  assert.equal((await orders.list()).length, 0);
});
