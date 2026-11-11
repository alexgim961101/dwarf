import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderTotals } from '../src/orders/totals.js';

const book = { sku: 'BK-DIC-KE', unitPrice: 27000, taxClass: 'exempt' };
const paper = { sku: 'PP-A4-500', unitPrice: 6490, taxClass: 'standard' };
const stapler = { sku: 'ST-STP-10', unitPrice: 4275, taxClass: 'standard' };

test('정률 쿠폰은 최대 할인액을 넘지 않는다', () => {
  const coupon = { kind: 'percent', value: 10, maxDiscount: 20000 };
  const totals = orderTotals([{ ...book, qty: 10 }], { coupon });
  assert.equal(totals.discount, 20000);
  assert.equal(totals.total, 250000);
});

test('최소 주문액에 못 미치면 쿠폰이 적용되지 않는다', () => {
  const coupon = { kind: 'amount', value: 5000, minSubtotal: 30000 };
  assert.equal(orderTotals([{ ...paper, qty: 2 }], { coupon }).discount, 0);
});

test('정액 쿠폰은 주문액보다 많이 깎지 않는다', () => {
  const coupon = { kind: 'amount', value: 5000 };
  const totals = orderTotals([{ ...stapler, qty: 1 }], { coupon });
  assert.deepEqual(totals, { subtotal: 4275, discount: 4275, shipping: 3000, tax: 0, total: 3000 });
});

test('줄이 없으면 모두 0이다', () => {
  assert.deepEqual(orderTotals([]), { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 });
});
