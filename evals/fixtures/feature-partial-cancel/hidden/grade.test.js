import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderService } from '../src/orders/service.js';
import { createOrderRepository } from '../src/orders/repository.js';
import { createFakeInventory, createFakeNotifier, createFakePayments } from '../src/dev/fakes.js';

const PAID = 48000;
const setup = (status = 'paid') => {
  const deps = {
    orders: createOrderRepository([{
      id: 'O-1',
      customerId: 'c-1',
      status,
      items: [
        { sku: 'A', qty: 2, unitPrice: 10000 },
        { sku: 'B', qty: 1, unitPrice: 30000 },
      ],
      discount: 5000,
      shippingFee: 3000,
    }]),
    payments: createFakePayments({ captured: { 'O-1': PAID } }),
    inventory: createFakeInventory(),
    notifier: createFakeNotifier(),
  };
  return { ...deps, service: createOrderService(deps) };
};
const releasedOf = (inventory, sku) => inventory.released.filter((r) => r.sku === sku).reduce((s, r) => s + r.qty, 0);

test('partial-releases-stock', async () => {
  const { service, inventory } = setup();
  await service.cancelItems('O-1', [{ sku: 'A', qty: 1 }]);
  assert.equal(releasedOf(inventory, 'A'), 1);
  assert.equal(releasedOf(inventory, 'B'), 0);
});

test('partial-refund-bounded', async () => {
  const { service, payments } = setup();
  await service.cancelItems('O-1', [{ sku: 'A', qty: 1 }]);
  const refunded = payments.refundedTotal('O-1');
  assert.ok(refunded > 0 && refunded <= 10000, `refund ${refunded}`);
});

test('optional-partial-notifies-customer', async () => {
  const { service, notifier } = setup();
  await service.cancelItems('O-1', [{ sku: 'A', qty: 1 }]);
  assert.ok(notifier.sent.some((n) => n.customerId === 'c-1'));
});

test('cancel-everything-by-parts-refunds-all', async () => {
  const { service, payments, orders } = setup();
  await service.cancelItems('O-1', [{ sku: 'A', qty: 1 }]);
  await service.cancelItems('O-1', [{ sku: 'A', qty: 1 }]);
  await service.cancelItems('O-1', [{ sku: 'B', qty: 1 }]);
  assert.equal(payments.refundedTotal('O-1'), PAID);
  assert.equal(orders.get('O-1').status, 'cancelled');
});

test('full-cancel-after-partial', async () => {
  const { service, payments, inventory } = setup();
  await service.cancelItems('O-1', [{ sku: 'A', qty: 1 }]);
  await service.cancelOrder('O-1');
  assert.equal(payments.refundedTotal('O-1'), PAID);
  assert.equal(releasedOf(inventory, 'A'), 2);
  assert.equal(releasedOf(inventory, 'B'), 1);
});

test('over-cancel-rejected', async () => {
  const { service, payments, inventory } = setup();
  await assert.rejects(service.cancelItems('O-1', [{ sku: 'A', qty: 3 }]));
  assert.equal(payments.refunds.length, 0);
  assert.equal(inventory.released.length, 0);
});

test('cumulative-over-cancel-rejected', async () => {
  const { service } = setup();
  await service.cancelItems('O-1', [{ sku: 'A', qty: 1 }]);
  await assert.rejects(service.cancelItems('O-1', [{ sku: 'A', qty: 2 }]));
});

test('unknown-sku-rejected', async () => {
  const { service, payments } = setup();
  await assert.rejects(service.cancelItems('O-1', [{ sku: 'Z', qty: 1 }]));
  assert.equal(payments.refunds.length, 0);
});

test('shipped-order-rejected', async () => {
  const { service } = setup('shipped');
  await assert.rejects(service.cancelItems('O-1', [{ sku: 'A', qty: 1 }]), { code: 'ORDER_NOT_CANCELLABLE' });
});

test('full-cancel-unchanged', async () => {
  const { service, payments } = setup();
  await service.cancelOrder('O-1');
  assert.equal(payments.refundedTotal('O-1'), PAID);
});

test('invalid-request-has-no-side-effects', async () => {
  const { service, payments, inventory } = setup();
  await assert.rejects(service.cancelItems('O-1', [{ sku: 'A', qty: 1 }, { sku: 'Z', qty: 1 }]));
  assert.equal(payments.refunds.length, 0);
  assert.equal(inventory.released.length, 0);
});
