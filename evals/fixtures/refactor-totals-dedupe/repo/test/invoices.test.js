import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { fixedClock } from '../src/lib/clock.js';
import { LEDGER_HEADER, ledgerCsv } from '../src/invoices/ledger.js';

const NOW = '2026-10-12T03:00:00.000Z';

test('한 줄 주문의 세금계산서', async () => {
  const { orders, invoices } = createApp({ clock: fixedClock(NOW) });
  const order = await orders.place({ customer: 'C-7', region: 'seoul', items: [{ sku: 'PP-A4-500', qty: 4 }] });
  const invoice = await invoices.build(order.id);
  assert.equal(invoice.number, 'INV-0001');
  assert.equal(invoice.kind, 'invoice');
  assert.equal(invoice.issuedOn, '2026-10-12');
  assert.equal(invoice.lines[0].amount, 25960);
  assert.equal(invoice.lines[0].tax, 2596);
  assert.deepEqual(invoice.totals, { subtotal: 25960, discount: 0, tax: 2596, shipping: 3000, total: 31556 });
});

test('세금계산서 세액은 줄별 세액의 합이다', async () => {
  const { orders, invoices } = createApp({ clock: fixedClock(NOW) });
  const order = await orders.place({
    customer: 'C-7',
    region: 'seoul',
    items: [{ sku: 'PN-GEL-05', qty: 2 }, { sku: 'PP-A4-500', qty: 1 }],
  });
  const invoice = await invoices.build(order.id);
  assert.deepEqual(invoice.lines.map((line) => line.tax), [1690, 649]);
  assert.equal(invoice.totals.tax, 2339);
});

test('원장 CSV는 머리글과 세금계산서마다 한 줄이다', async () => {
  const { orders, invoices } = createApp({ clock: fixedClock(NOW) });
  for (const qty of [1, 2, 3]) {
    const order = await orders.place({ customer: 'C-7', region: 'seoul', items: [{ sku: 'CL-DSK-01', qty }] });
    await invoices.build(order.id);
  }
  const rows = ledgerCsv(await invoices.list()).trimEnd().split('\n');
  assert.equal(rows[0], LEDGER_HEADER);
  assert.equal(rows.length, 4);
  for (const row of rows) assert.equal(row.split(',').length, 9);
});
