import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { createStore } from '../src/store.js';

const statuses = ['paid', 'pending', 'paid', 'shipped', 'paid', 'cancelled', 'paid', 'shipped', 'paid', 'refunded'];
const orders = statuses.map((status, i) => ({
  id: `X-${i + 1}`,
  status,
  amount: 1000 + i,
  createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
}));
const newestFirst = (list) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((o) => o.id);
const only = (...wanted) => newestFirst(orders.filter((o) => wanted.includes(o.status)));

let server;
let base;
before(async () => {
  server = createServer(createStore(orders));
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const get = async (path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};

test('single-status', async () => {
  const { status, body } = await get('/orders?status=paid');
  assert.equal(status, 200);
  assert.deepEqual(body.items.map((o) => o.id), only('paid'));
  assert.equal(body.total, 5);
});

test('multiple-statuses', async () => {
  const { body } = await get('/orders?status=paid,shipped');
  assert.deepEqual(body.items.map((o) => o.id), only('paid', 'shipped'));
  assert.equal(body.total, 7);
});

test('filter-before-pagination', async () => {
  const { body } = await get('/orders?status=paid&size=2&page=2');
  assert.deepEqual(body.items.map((o) => o.id), only('paid').slice(2, 4));
  assert.equal(body.total, 5);
});

test('unknown-status-400', async () => {
  const { status, body } = await get('/orders?status=done');
  assert.equal(status, 400);
  assert.equal(typeof body.error, 'string');
});

test('partly-unknown-status-400', async () => {
  const { status } = await get('/orders?status=paid,done');
  assert.equal(status, 400);
});

test('no-status-unchanged', async () => {
  const { body } = await get('/orders?size=100');
  assert.equal(body.total, orders.length);
  assert.deepEqual(body.items.map((o) => o.id), newestFirst(orders));
});
