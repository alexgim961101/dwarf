import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchOrderEvent } from '../src/dispatcher.js';
import { createMemoryProvider } from '../src/providers/memory.js';

const noSleep = async () => {};
const paidEvent = (notify) => ({
  eventId: 'evt_1001',
  type: 'order.paid',
  orderId: 'A-1001',
  customer: { email: 'kim@example.com', phone: '010-1234-5678', notify },
});

test('고객이 고른 채널마다 한 번씩 보낸다', async () => {
  const provider = createMemoryProvider();
  await dispatchOrderEvent(paidEvent(['email', 'sms']), { provider, sleep: noSleep });
  assert.deepEqual(provider.delivered.map((m) => m.channel), ['email', 'sms']);
});

test('연결 실패는 재시도해서 보낸다', async () => {
  const provider = createMemoryProvider({ failures: [{ when: 'before' }] });
  await dispatchOrderEvent(paidEvent(['email']), { provider, sleep: noSleep });
  assert.equal(provider.delivered.length, 1);
});

test('재시도 횟수를 넘기면 오류를 낸다', async () => {
  const provider = createMemoryProvider({
    failures: [{ when: 'before' }, { when: 'before' }, { when: 'before' }],
  });
  await assert.rejects(dispatchOrderEvent(paidEvent(['email']), { provider, sleep: noSleep }), {
    code: 'ECONNRESET',
  });
});
