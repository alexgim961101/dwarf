import { randomUUID } from 'node:crypto';
import { render } from './templates.js';

// 채널별 메시지를 만든다. id는 provider가 중복 전송을 거르는 키다.
export function buildMessage(event, channel) {
  return {
    id: randomUUID(),
    channel,
    to: channel === 'sms' ? event.customer.phone : event.customer.email,
    body: render(event.type, event),
  };
}
