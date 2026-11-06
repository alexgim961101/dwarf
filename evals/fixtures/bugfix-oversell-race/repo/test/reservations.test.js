import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStockStore } from '../src/inventory/stock-store.js';
import { createReservations } from '../src/inventory/reservations.js';
import { createFakePricing, createFakeRefunds } from '../src/dev/fakes.js';

const prices = { 'SKU-RED': 12000 };
const setup = (level = 3) => {
  const stock = createStockStore({ 'SKU-RED': level });
  const refunds = createFakeRefunds();
  const reservations = createReservations({ stock, pricing: createFakePricing({ prices }), refunds });
  return { stock, refunds, reservations };
};

test('예약하면 재고가 줄고 가격이 붙는다', async () => {
  const { stock, reservations } = setup();
  const r = await reservations.reserve('SKU-RED', 2, 'c-1');
  assert.equal(stock.get('SKU-RED'), 1);
  assert.equal(r.price, 24000);
});

test('재고보다 많이 예약하면 거절한다', async () => {
  const { reservations } = setup(1);
  await assert.rejects(reservations.reserve('SKU-RED', 2, 'c-1'), { code: 'INSUFFICIENT_STOCK' });
});

test('취소하면 환불하고 재고를 돌려놓는다', async () => {
  const { stock, refunds, reservations } = setup();
  const r = await reservations.reserve('SKU-RED', 1, 'c-1');
  await reservations.cancel(r.id);
  assert.equal(stock.get('SKU-RED'), 3);
  assert.deepEqual(refunds.issued, [{ customerId: 'c-1', amount: 12000 }]);
});

test('이미 취소한 예약은 다시 취소해도 그대로', async () => {
  const { refunds, reservations } = setup();
  const r = await reservations.reserve('SKU-RED', 1, 'c-1');
  await reservations.cancel(r.id);
  await reservations.cancel(r.id);
  assert.equal(refunds.issued.length, 1);
});
