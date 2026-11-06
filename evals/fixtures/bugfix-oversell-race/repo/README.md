# stock-service

상품 재고 예약 서비스. 결제 전에 재고를 잡아 두고, 취소하면 환불하고 재고를 돌려놓는다.

- `src/inventory/reservations.js`: 예약·취소
- `src/inventory/stock-store.js`: SKU별 재고. 운영에서는 같은 인터페이스의 DB 어댑터를 쓴다
- `src/pricing/client.js`: 가격 서비스 클라이언트
- `src/refunds/client.js`: 환불 서비스 클라이언트
- `src/reports/daily.js`: 일일 재고 리포트
- `src/dev/fakes.js`: 로컬 개발·테스트용 가격·환불 서비스

HTTP 서버는 요청을 동시에 처리한다.

```bash
npm test
```
