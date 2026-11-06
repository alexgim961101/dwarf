import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStockStore } from '../src/inventory/stock-store.js';
import { createReservations } from '../src/inventory/reservations.js';
import { createFakePricing, createFakeRefunds } from '../src/dev/fakes.js';

const prices = { A: 100, B: 200, C: 300, D: 400, E: 500, F: 600, G: 700, H: 800 };
const make = ({ level = { A: 10 }, pricing = {}, refunds = {} } = {}) => {
  const stock = createStockStore(level);
  const refundClient = createFakeRefunds(refunds);
  const reservations = createReservations({
    stock,
    pricing: createFakePricing({ prices, ...pricing }),
    refunds: refundClient,
  });
  return { stock, refunds: refundClient, reservations };
};

test('concurrent-reserve-no-oversell', async () => {
  const { stock, reservations } = make();
  const results = await Promise.allSettled(Array.from({ length: 50 }, (_, i) => reservations.reserve('A', 1, `c-${i}`)));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 10);
  assert.equal(stock.get('A'), 0);
  for (const r of results.filter((x) => x.status === 'rejected')) assert.equal(r.reason.code, 'INSUFFICIENT_STOCK');
});

test('concurrent-reserve-multi-qty', async () => {
  const { stock, reservations } = make({ level: { A: 5 } });
  const results = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => reservations.reserve('A', 2, `c-${i}`)));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2);
  assert.equal(stock.get('A'), 1);
});

test('quote-failure-keeps-stock', async () => {
  const { stock, reservations } = make({ pricing: { failWith: new Error('pricing 503') } });
  await assert.rejects(reservations.reserve('A', 3, 'c-1'));
  assert.equal(stock.get('A'), 10);
});

test('optional-concurrent-double-cancel-refunds-once', async () => {
  const { stock, refunds, reservations } = make();
  const r = await reservations.reserve('A', 4, 'c-1');
  await Promise.allSettled([reservations.cancel(r.id), reservations.cancel(r.id)]);
  assert.equal(refunds.issued.length, 1);
  assert.equal(stock.get('A'), 10);
});

test('refund-failure-keeps-reservation', async () => {
  const { stock, refunds, reservations } = make({ refunds: { failTimes: 1 } });
  const r = await reservations.reserve('A', 4, 'c-1');
  await assert.rejects(reservations.cancel(r.id));
  assert.equal(stock.get('A'), 6);
  await reservations.cancel(r.id);
  assert.equal(refunds.issued.length, 1);
  assert.equal(stock.get('A'), 10);
});

test('other-skus-not-serialized', async () => {
  const level = Object.fromEntries(Object.keys(prices).map((sku) => [sku, 5]));
  const { reservations } = make({ level, pricing: { delayMs: 40 } });
  const started = performance.now();
  await Promise.all(Object.keys(prices).map((sku) => reservations.reserve(sku, 1, 'c-1')));
  assert.ok(performance.now() - started < 200, 'SKU가 다른 예약은 서로 기다리지 않아야 한다');
});

test('sequential-insufficient-still-errors', async () => {
  const { reservations } = make({ level: { A: 1 } });
  await reservations.reserve('A', 1, 'c-1');
  await assert.rejects(reservations.reserve('A', 1, 'c-2'), { code: 'INSUFFICIENT_STOCK' });
});
