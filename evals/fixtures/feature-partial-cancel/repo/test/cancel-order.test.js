import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderService } from '../src/orders/service.js';
import { createOrderRepository } from '../src/orders/repository.js';
import { createFakeInventory, createFakeNotifier, createFakePayments } from '../src/dev/fakes.js';

const order = (status = 'paid') => ({
  id: 'O-1',
  customerId: 'c-1',
  status,
  items: [
    { sku: 'A', qty: 2, unitPrice: 10000 },
    { sku: 'B', qty: 1, unitPrice: 30000 },
  ],
  discount: 5000,
  shippingFee: 3000,
});

const setup = (status) => {
  const deps = {
    orders: createOrderRepository([order(status)]),
    payments: createFakePayments({ captured: { 'O-1': 48000 } }),
    inventory: createFakeInventory(),
    notifier: createFakeNotifier(),
  };
  return { ...deps, service: createOrderService(deps) };
};

test('전체 취소하면 결제 금액 전부 환불, 재고 복구, 알림', async () => {
  const { service, payments, inventory, notifier, orders } = setup();
  await service.cancelOrder('O-1');
  assert.equal(payments.refundedTotal('O-1'), 48000);
  assert.deepEqual(inventory.released, [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 1 }]);
  assert.equal(notifier.sent[0].template, 'order.cancelled');
  assert.equal(orders.get('O-1').status, 'cancelled');
});

test('발송된 주문은 취소할 수 없다', async () => {
  const { service } = setup('shipped');
  await assert.rejects(service.cancelOrder('O-1'), { code: 'ORDER_NOT_CANCELLABLE' });
});

test('없는 주문', async () => {
  const { service } = setup();
  await assert.rejects(service.cancelOrder('O-404'), { code: 'ORDER_NOT_FOUND' });
});
