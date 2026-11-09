import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createServer } from '../src/http/server.js';
import { createCatalog } from '../src/catalog/catalog.js';
import { createMemoryStockRepo } from '../src/inventory/stock-repo.js';
import { createFakePricing, createFakeRefunds } from '../src/dev/fakes.js';

const catalog = createCatalog([{ sku: 'TEE-BLK-M', name: '기본 티셔츠 블랙 M', backorderable: false }]);
const app = createApp({
  repo: createMemoryStockRepo({ 'TEE-BLK-M': 2 }),
  catalog,
  pricing: createFakePricing({ prices: { 'TEE-BLK-M': 12000 } }),
  refunds: createFakeRefunds(),
});
const server = createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://localhost:${server.address().port}`;
after(() => server.close());

const post = (path, body) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('예약 API는 201과 예약을 돌려주고 재고가 준다', async () => {
  const res = await post('/reservations', { sku: 'TEE-BLK-M', qty: 1, customerId: 'c-1' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, 'active');
  const stock = await (await fetch(`${base}/stock/TEE-BLK-M`)).json();
  assert.equal(stock.qty, 1);
});

test('재고 부족은 409, 모르는 경로는 404', async () => {
  const res = await post('/reservations', { sku: 'TEE-BLK-M', qty: 5, customerId: 'c-1' });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, 'INSUFFICIENT_STOCK');
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});

test('일일 리포트는 텍스트로 온다', async () => {
  const res = await fetch(`${base}/reports/daily`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/plain/);
  assert.match(await res.text(), /^# 재고 \d{4}-\d{2}-\d{2}\n/);
});
