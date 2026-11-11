import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createServer } from '../src/http/server.js';

test('수량이 0, 음수, 소수인 주문은 접수하지 않는다', async () => {
  const { orders } = createApp();
  for (const qty of [0, -2, 1.5]) {
    await assert.rejects(
      orders.place({ customer: 'C-1', region: 'seoul', items: [{ sku: 'PP-A4-500', qty }] }),
      { code: 'INVALID_QUANTITY' },
    );
  }
  assert.equal((await orders.list()).length, 0);
});

test('주문 API는 잘못된 수량에 422를 준다', async () => {
  const server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, resolve));
  after(() => server.close());
  const res = await fetch(`http://localhost:${server.address().port}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ customer: 'C-1', region: 'seoul', items: [{ sku: 'PP-A4-500', qty: 0 }] }),
  });
  assert.equal(res.status, 422);
  assert.equal((await res.json()).error, 'INVALID_QUANTITY');
});
