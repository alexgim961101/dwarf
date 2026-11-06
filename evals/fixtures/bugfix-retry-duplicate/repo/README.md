# notifier

주문 이벤트를 받아 고객에게 이메일·SMS 알림을 보내는 서비스.

- `src/dispatcher.js`: 주문 이벤트를 고객이 고른 채널마다 보낸다.
- `src/reminder.js`: 장바구니 리마인더를 보낸다.
- `src/retry.js`: 연결 실패·타임아웃·5xx는 최대 3번까지 재시도한다.
- `src/providers/memory.js`: 개발·테스트용 provider. 실제 provider처럼 같은 메시지 id는 한 번만 전달한다.

```bash
npm test
```
