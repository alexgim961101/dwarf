import { buildMessage } from './message.js';
import { channelsFor } from './channels.js';
import { withRetry } from './retry.js';

// 주문 이벤트 하나를 고객이 고른 채널마다 보낸다.
export async function dispatchOrderEvent(event, { provider, sleep } = {}) {
  const results = [];
  for (const channel of channelsFor(event)) {
    const id = await withRetry(async () => {
      const message = buildMessage(event, channel);
      await provider.send(message);
      return message.id;
    }, { sleep });
    results.push({ channel, id });
  }
  return results;
}
