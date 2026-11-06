import { buildMessage } from './message.js';
import { withRetry } from './retry.js';

// 장바구니 리마인더는 이메일로만 보낸다.
export async function sendCartReminder(event, { provider, sleep } = {}) {
  return withRetry(() => {
    const message = buildMessage(event, 'email');
    return provider.send(message).then(() => message.id);
  }, { sleep });
}
