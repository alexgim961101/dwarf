import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createServer } from '../src/http/server.js';

const server = createServer(createApp());
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://localhost:${server.address().port}`;
after(() => server.close());

const post = (path, body) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('주문 API는 201과 주문을 돌려주고 다시 조회된다', async () => {
  const res = await post('/orders', { customer: 'C-3', region: 'busan', items: [{ sku: 'PP-A4-500', qty: 2 }] });
  assert.equal(res.status, 201);
  const order = await res.json();
  assert.equal(order.totals.total, 17278);
  const found = await (await fetch(`${base}/orders/${order.id}`)).json();
  assert.equal(found.customer, 'C-3');
});

test('장바구니 미리 보기 API', async () => {
  const res = await post('/cart/summary', { items: [{ sku: 'BK-DIC-KE', qty: 2 }] });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).totals.total, 54000);
});

test('없는 주문과 없는 경로는 404다', async () => {
  const missing = await fetch(`${base}/orders/ORD-9999`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'ORDER_NOT_FOUND');
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});
