import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createCatalog } from '../src/catalog/catalog.js';
import { createMemoryStockRepo } from '../src/inventory/stock-repo.js';
import { createFakePricing, createFakeRefunds } from '../src/dev/fakes.js';

const skus = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const prices = Object.fromEntries(skus.map((sku, i) => [sku, (i + 1) * 100]));
prices.PRE = 900;
const catalog = createCatalog([
  ...skus.map((sku) => ({ sku, name: `item ${sku}`, backorderable: false })),
  { sku: 'PRE', name: 'preorder item', backorderable: true },
]);

const make = ({ level = { A: 10 }, pricing = {}, refunds = {} } = {}) => {
  const repo = createMemoryStockRepo(level);
  const refundClient = createFakeRefunds(refunds);
  const app = createApp({ repo, catalog, pricing: createFakePricing({ prices, ...pricing }), refunds: refundClient });
  return { ...app, refunds: refundClient };
};
const settled = (promises) => Promise.allSettled(promises);
const fulfilled = (results) => results.filter((r) => r.status === 'fulfilled').length;

test('concurrent-reserve-no-oversell', async () => {
  const { repo, reservations } = make();
  const results = await settled(Array.from({ length: 50 }, (_, i) => reservations.reserve('A', 1, `c-${i}`)));
  assert.equal(fulfilled(results), 10);
  assert.equal(await repo.get('A'), 0);
  for (const r of results.filter((x) => x.status === 'rejected')) assert.equal(r.reason.code, 'INSUFFICIENT_STOCK');
});

test('concurrent-reserve-multi-qty', async () => {
  const { repo, reservations } = make({ level: { A: 5 } });
  const results = await settled(Array.from({ length: 5 }, (_, i) => reservations.reserve('A', 2, `c-${i}`)));
  assert.equal(fulfilled(results), 2);
  assert.equal(await repo.get('A'), 1);
});

test('concurrent-pos-sale-no-negative', async () => {
  const { repo, sales } = make({ level: { A: 6 } });
  const results = await settled(Array.from({ length: 20 }, (_, i) => sales.recordSale('A', 1, `reg-${i % 3}`)));
  assert.equal(fulfilled(results), 6);
  assert.equal(await repo.get('A'), 0);
});

test('concurrent-reserve-and-pos-sale-no-negative', async () => {
  const { repo, reservations, sales } = make({ level: { A: 20 } });
  const ops = [];
  for (let i = 0; i < 25; i += 1) {
    ops.push(reservations.reserve('A', 1, `c-${i}`));
    ops.push(sales.recordSale('A', 1, 'reg-1'));
  }
  const results = await settled(ops);
  assert.equal(fulfilled(results), 20);
  assert.equal(await repo.get('A'), 0);
});

test('concurrent-ops-conserve-stock', async () => {
  const { repo, reservations, restock } = make({ level: { A: 5 } });
  const reserves = [];
  const restocks = [];
  for (let i = 0; i < 10; i += 1) {
    reserves.push(reservations.reserve('A', 1, `c-${i}`));
    restocks.push(restock.receive(`dn-${i}`, [{ sku: 'A', qty: 1 }]));
  }
  const reserved = fulfilled(await settled(reserves));
  await Promise.all(restocks);
  const level = await repo.get('A');
  assert.equal(level, 5 + 10 - reserved);
  assert.ok(level >= 0);
});

test('regular-sku-never-stored-negative', async () => {
  // 차감 뒤 음수면 되돌리는 수정은 최종값은 맞지만 잠깐 음수를 저장한다. 그 순간을 스냅샷·리포트가 본다.
  const repo = createMemoryStockRepo({ A: 10 });
  const negatives = [];
  const adjust = repo.adjust.bind(repo);
  // 감시만 한다. 인자는 그대로 넘긴다. 조건부 차감을 옵션 인자로 넘기는 수정이 있다(2026-11-11 측정).
  repo.adjust = async (sku, delta, ...rest) => {
    const level = await adjust(sku, delta, ...rest);
    if (sku === 'A' && level < 0) negatives.push(level);
    return level;
  };
  const set = repo.set.bind(repo);
  repo.set = async (sku, qty, ...rest) => {
    if (sku === 'A' && qty < 0) negatives.push(qty);
    return set(sku, qty, ...rest);
  };
  const app = createApp({ repo, catalog, pricing: createFakePricing({ prices }), refunds: createFakeRefunds() });
  const ops = [];
  for (let i = 0; i < 20; i += 1) {
    ops.push(app.reservations.reserve('A', 1, `c-${i}`));
    ops.push(app.sales.recordSale('A', 1, 'reg-1'));
  }
  let polling = true;
  const poller = (async () => {
    while (polling) if ((await repo.get('A')) < 0) negatives.push('observed');
  })();
  await settled(ops);
  polling = false;
  await poller;
  assert.deepEqual(negatives, [], '일반 상품 재고가 잠깐이라도 음수로 저장되면 안 된다');
});

test('doomed-large-sale-does-not-reject-valid-small-sale', async () => {
  // 재고 1에 5개 판매와 1개 판매가 동시에 오면 1개 판매는 성공해야 한다.
  const { repo, sales } = make({ level: { A: 1 } });
  const [big, small] = await settled([sales.recordSale('A', 5, 'reg-1'), sales.recordSale('A', 1, 'reg-2')]);
  assert.equal(big.status, 'rejected');
  assert.equal(big.reason.code, 'INSUFFICIENT_STOCK');
  assert.equal(small.status, 'fulfilled');
  assert.equal(await repo.get('A'), 0);
});

test('quote-failure-keeps-stock', async () => {
  const failWith = Object.assign(new Error('pricing 503'), { status: 503 });
  const { repo, reservations } = make({ pricing: { failWith } });
  await assert.rejects(reservations.reserve('A', 3, 'c-1'));
  assert.equal(await repo.get('A'), 10);
});

test('backorderable-reserve-goes-negative', async () => {
  const { repo, reservations } = make({ level: { PRE: 2 } });
  const results = await settled(Array.from({ length: 5 }, (_, i) => reservations.reserve('PRE', 1, `c-${i}`)));
  assert.equal(fulfilled(results), 5);
  assert.equal(await repo.get('PRE'), -3);
});

test('backorderable-pos-sale-stops-at-zero', async () => {
  const { repo, sales } = make({ level: { PRE: 1 } });
  await sales.recordSale('PRE', 1, 'reg-1');
  await assert.rejects(sales.recordSale('PRE', 1, 'reg-1'), { code: 'INSUFFICIENT_STOCK' });
  assert.equal(await repo.get('PRE'), 0);
});

test('report-shows-actual-levels', async () => {
  const { reports } = make({ level: { A: 3, B: 0, PRE: -4 } });
  const report = await reports.daily();
  assert.match(report, /^A\t3\t/m);
  assert.match(report, /^B\t0\t/m);
  assert.match(report, /^PRE\t-4\t/m);
});

test('other-skus-not-serialized', async () => {
  const level = Object.fromEntries(skus.map((sku) => [sku, 5]));
  const { reservations } = make({ level, pricing: { delayMs: 40 } });
  const started = performance.now();
  await Promise.all(skus.map((sku) => reservations.reserve(sku, 1, 'c-1')));
  assert.ok(performance.now() - started < 200, 'SKU가 다른 예약은 서로 기다리지 않아야 한다');
});

test('sequential-insufficient-still-errors', async () => {
  const { reservations } = make({ level: { A: 1 } });
  await reservations.reserve('A', 1, 'c-1');
  await assert.rejects(reservations.reserve('A', 1, 'c-2'), { code: 'INSUFFICIENT_STOCK' });
});

test('refund-failure-keeps-reservation', async () => {
  const { repo, refunds, reservations } = make({ refunds: { failTimes: 1 } });
  const r = await reservations.reserve('A', 4, 'c-1');
  await assert.rejects(reservations.cancel(r.id));
  assert.equal(await repo.get('A'), 6);
  assert.equal(reservations.get(r.id).status, 'active');
  await reservations.cancel(r.id);
  assert.equal(refunds.issued.length, 1);
  assert.equal(await repo.get('A'), 10);
});

test('optional-concurrent-double-cancel-refunds-once', async () => {
  const { repo, refunds, reservations } = make();
  const r = await reservations.reserve('A', 4, 'c-1');
  await settled([reservations.cancel(r.id), reservations.cancel(r.id)]);
  assert.equal(refunds.issued.length, 1);
  assert.equal(await repo.get('A'), 10);
});
