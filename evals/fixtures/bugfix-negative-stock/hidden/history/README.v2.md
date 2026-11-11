# stockroom

온라인 재고 서비스. 결제 전에 재고를 잡아 두고, 취소하면 환불하고 재고를 돌려놓는다.

## 구조

- `src/app.js`: 조립. 저장소·카탈로그·외부 클라이언트를 받아 서비스 객체를 만든다. 서버·테스트가 모두 이걸 쓴다
- `src/catalog/`: 상품 카탈로그(`items.json`). 예약 주문 상품(`backorderable`)은 재고가 없어도 예약을 받고 입고 뒤 출고한다
- `src/inventory/stock-repo.js`: 재고 저장소 인터페이스와 메모리 구현. 운영은 같은 인터페이스의 Postgres 어댑터(`stockroom-pg`, 별도 패키지)
- `src/inventory/reservations.js`: 예약·취소·확정
- `src/inventory/restock.js`: 입고
- `src/pricing/`, `src/refunds/`: 가격·환불 서비스 클라이언트. 연결 실패·5xx는 `src/lib/retry.js`로 재시도
- `src/reports/`: 일일 재고 리포트
- `src/http/`: JSON API
- `src/dev/`: 로컬용 가짜 외부 서비스와 실행 스크립트

## 실행

```bash
npm test
npm run dev   # http://localhost:4732
```

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/reservations` | `{ sku, qty, customerId }` 예약 |
| POST | `/reservations/:id/confirm` | 결제 완료 뒤 확정 |
| DELETE | `/reservations/:id` | 취소. 환불하고 재고를 돌려놓는다 |
| POST | `/restock` | `{ deliveryNoteId, lines: [{ sku, qty }] }` 입고 |
| GET | `/stock/:sku` | 현재 재고 |
| GET | `/reports/daily` | 일일 재고 리포트(텍스트) |
