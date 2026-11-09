import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createCatalog } from '../src/catalog/catalog.js';
import { createMemoryStockRepo } from '../src/inventory/stock-repo.js';

const catalog = createCatalog([
  { sku: 'SOCK-3P', name: '양말 3켤레', backorderable: false },
  { sku: 'BAG-TOTE', name: '토트백', backorderable: false },
]);

const setup = () => {
  const repo = createMemoryStockRepo({ 'SOCK-3P': 10 });
  return { repo, restock: createApp({ repo, catalog }).restock };
};

test('입고하면 납품서의 줄마다 재고가 는다', async () => {
  const { repo, restock } = setup();
  const record = await restock.receive('dn-1', [
    { sku: 'SOCK-3P', qty: 5 },
    { sku: 'BAG-TOTE', qty: 3 },
  ]);
  assert.equal(record.deliveryNoteId, 'dn-1');
  assert.equal(await repo.get('SOCK-3P'), 15);
  assert.equal(await repo.get('BAG-TOTE'), 3);
});

test('같은 납품서는 동시에 두 번 보내도 한 번만 반영한다', async () => {
  const { repo, restock } = setup();
  const [a, b] = await Promise.all([
    restock.receive('dn-2', [{ sku: 'SOCK-3P', qty: 4 }]),
    restock.receive('dn-2', [{ sku: 'SOCK-3P', qty: 4 }]),
  ]);
  assert.equal(a.id, b.id);
  assert.equal(await repo.get('SOCK-3P'), 14);
});

test('모르는 SKU나 잘못된 수량이 있으면 아무것도 반영하지 않는다', async () => {
  const { repo, restock } = setup();
  await assert.rejects(restock.receive('dn-3', [{ sku: 'SOCK-3P', qty: 1 }, { sku: 'NOPE', qty: 1 }]), { code: 'UNKNOWN_SKU' });
  await assert.rejects(restock.receive('dn-4', [{ sku: 'SOCK-3P', qty: 0 }]), { code: 'INVALID_QUANTITY' });
  assert.equal(await repo.get('SOCK-3P'), 10);
});
