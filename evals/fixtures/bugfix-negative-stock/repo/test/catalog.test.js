import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/catalog/catalog.js';

test('items.json의 상품은 sku·name·backorderable을 모두 가진다', () => {
  const items = loadCatalog().all();
  assert.ok(items.length >= 5);
  for (const item of items) {
    assert.equal(typeof item.sku, 'string');
    assert.equal(typeof item.name, 'string');
    assert.equal(typeof item.backorderable, 'boolean');
  }
});

test('없는 SKU는 UNKNOWN_SKU', () => {
  const catalog = loadCatalog();
  assert.throws(() => catalog.get('NOPE'), { code: 'UNKNOWN_SKU' });
  assert.equal(catalog.has('NOPE'), false);
});
