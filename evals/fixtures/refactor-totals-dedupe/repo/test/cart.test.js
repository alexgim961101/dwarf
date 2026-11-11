import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const { cart } = createApp();

test('장바구니 금액: 과세 상품 한 줄', () => {
  const { items, totals } = cart.summarize({ items: [{ sku: 'PP-A4-500', qty: 2 }], region: 'seoul' });
  assert.equal(items[0].amount, 12980);
  assert.deepEqual(totals, {
    subtotal: 12980,
    discount: 0,
    shipping: 3000,
    tax: 1298,
    total: 17278,
    freeShippingGap: 37020,
  });
});

test('정률 쿠폰을 쓰면 할인 뒤 금액에 세액이 붙는다', () => {
  const { totals } = cart.summarize({ items: [{ sku: 'PN-GEL-05', qty: 10 }], couponCode: 'WELCOME10' });
  assert.equal(totals.discount, 8450);
  assert.equal(totals.shipping, 0);
  assert.equal(totals.tax, 7605);
  assert.equal(totals.total, 83655);
  assert.equal(totals.freeShippingGap, 0);
});

test('면세 상품은 세액이 없다', () => {
  const { totals } = cart.summarize({ items: [{ sku: 'BK-DIC-KE', qty: 2 }] });
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 54000);
});

test('도서산간은 배송비가 더 붙는다', () => {
  const { totals } = cart.summarize({ items: [{ sku: 'ST-STP-10', qty: 1 }], region: 'jeju' });
  assert.equal(totals.shipping, 6000);
  assert.equal(totals.tax, 428);
  assert.equal(totals.total, 10703);
});
