import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { createStore } from '../src/store.js';
import { seedOrders } from '../src/seed.js';

let server;
let base;

before(async () => {
  server = createServer(createStore(seedOrders));
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const get = async (path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};

test('기본은 첫 페이지 20개, 최신순', async () => {
  const { status, body } = await get('/orders');
  assert.equal(status, 200);
  assert.equal(body.total, seedOrders.length);
  assert.equal(body.items[0].id, 'O-1012');
});

test('page와 size로 자른다', async () => {
  const { body } = await get('/orders?page=2&size=5');
  assert.deepEqual(body.items.map((o) => o.id), ['O-1007', 'O-1006', 'O-1005', 'O-1004', 'O-1003']);
});

test('잘못된 page는 400', async () => {
  const { status, body } = await get('/orders?page=0');
  assert.equal(status, 400);
  assert.equal(body.error, 'invalid page');
});
