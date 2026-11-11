import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { fixedClock } from '../src/lib/clock.js';

const NOW = '2026-10-20T01:00:00.000Z';
const place = (orders) =>
  orders.place({
    customer: 'C-9',
    region: 'seoul',
    items: [{ sku: 'BK-WKB-3', qty: 5 }, { sku: 'PP-A4-500', qty: 4 }],
  });

test('반품 전표는 수량이 음수인 줄로 나간다', async () => {
  const { orders, invoices } = createApp({ clock: fixedClock(NOW) });
  const order = await place(orders);
  const credit = await invoices.credit(order.id, [{ sku: 'PP-A4-500', qty: 2 }]);
  assert.equal(credit.number, 'CN-0001');
  assert.equal(credit.kind, 'credit');
  assert.equal(credit.lines[0].qty, -2);
  assert.equal(credit.lines[0].amount, -12980);
  assert.deepEqual(credit.totals, { subtotal: -12980, discount: 0, tax: -1298, shipping: 0, total: -14278 });
});

test('주문에 없는 상품이나 주문보다 많은 수량은 반품할 수 없다', async () => {
  const { orders, invoices } = createApp({ clock: fixedClock(NOW) });
  const order = await place(orders);
  await assert.rejects(invoices.credit(order.id, [{ sku: 'NB-A5-80', qty: 1 }]), { code: 'UNKNOWN_SKU' });
  await assert.rejects(invoices.credit(order.id, [{ sku: 'PP-A4-500', qty: 5 }]), { code: 'INVALID_QUANTITY' });
});
