# order-service

주문 서비스. 결제·재고·알림 서비스를 부른다.

- `src/orders/service.js`: 주문 유스케이스. 지금은 전체 취소(`cancelOrder`)만 있다
- `src/orders/pricing.js`: 결제 금액 = 상품 합계 - 주문 할인 + 배송비
- `src/orders/repository.js`: 주문 저장소. 운영에서는 같은 인터페이스의 DB 어댑터
- `src/payments/client.js`, `src/inventory/client.js`, `src/notifications/client.js`: 외부 서비스 클라이언트
- `src/dev/fakes.js`: 로컬 개발·테스트용 결제·재고·알림 서비스

주문 상태: `paid`(결제 완료) → `shipped`(발송) 또는 `cancelled`(취소). 금액 단위는 원.

```bash
npm test
```
