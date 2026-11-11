import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/catalog/catalog.js';
import { loadCoupons } from '../src/coupons/coupons.js';

test('카탈로그는 상품을 SKU로 찾는다', () => {
  const catalog = loadCatalog();
  assert.equal(catalog.get('PP-A4-500').unitPrice, 6490);
  assert.equal(catalog.get('BK-DIC-KE').taxClass, 'exempt');
  assert.equal(catalog.all().length, 10);
});

test('없는 상품과 없는 쿠폰은 오류다', () => {
  assert.throws(() => loadCatalog().get('NOPE'), { code: 'UNKNOWN_SKU' });
  assert.throws(() => loadCoupons().get('NOPE'), { code: 'UNKNOWN_COUPON' });
});
