import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchOrderEvent } from '../src/dispatcher.js';
import { sendCartReminder } from '../src/reminder.js';
import { createMemoryProvider } from '../src/providers/memory.js';

const noSleep = async () => {};
const customer = { email: 'kim@example.com', phone: '010-1234-5678' };
const orderEvent = (eventId, type, notify = ['email']) => ({
  eventId,
  type,
  orderId: 'A-1001',
  customer: { ...customer, notify },
});

test('order-timeout-after-delivery', async () => {
  const provider = createMemoryProvider({ failures: [{ when: 'after' }] });
  await dispatchOrderEvent(orderEvent('evt_1', 'order.paid'), { provider, sleep: noSleep });
  assert.equal(provider.delivered.length, 1);
});

test('order-each-channel-once', async () => {
  const provider = createMemoryProvider({ failures: [{ when: 'after' }, { when: 'after' }] });
  await dispatchOrderEvent(orderEvent('evt_2', 'order.paid', ['email', 'sms']), { provider, sleep: noSleep });
  assert.deepEqual(provider.delivered.map((m) => m.channel).sort(), ['email', 'sms']);
});

test('order-distinct-events-same-order', async () => {
  const provider = createMemoryProvider();
  await dispatchOrderEvent(orderEvent('evt_3', 'order.paid'), { provider, sleep: noSleep });
  await dispatchOrderEvent(orderEvent('evt_4', 'order.shipped'), { provider, sleep: noSleep });
  assert.equal(provider.delivered.length, 2);
});

test('order-connect-retry-still-works', async () => {
  const provider = createMemoryProvider({ failures: [{ when: 'before' }, { when: 'before' }] });
  await dispatchOrderEvent(orderEvent('evt_5', 'order.paid'), { provider, sleep: noSleep });
  assert.equal(provider.delivered.length, 1);
});

test('reminder-timeout-after-delivery', async () => {
  const provider = createMemoryProvider({ failures: [{ when: 'after' }] });
  await sendCartReminder(
    { eventId: 'evt_6', type: 'cart.reminder', itemCount: 2, customer },
    { provider, sleep: noSleep },
  );
  assert.equal(provider.delivered.length, 1);
});
