# wholesale

문구·도서 도매몰의 주문 서비스. 사업자 고객이 장바구니에서 금액을 미리 보고 주문한다. 금액은 모두 원 단위 정수이고 단가는 공급가(부가세 별도)다.

## 구조

- `src/app.js`: 조립. `createApp({ catalog, coupons, repo, clock, ids })`로 서비스 객체를 만든다. 서버·스크립트·테스트가 모두 이걸 쓴다
- `src/catalog/`: 상품(`products.json`). 도서는 면세(`taxClass: "exempt"`)
- `src/coupons/`: 쿠폰(`coupons.json`). 정률·정액, 최소 주문액, 최대 할인액
- `src/cart/`: 장바구니 금액 미리 보기
- `src/orders/`: 주문 접수와 조회. 저장소는 메모리 구현이고 운영은 같은 인터페이스의 DB 어댑터(별도 패키지)를 쓴다
- `src/shipping/zones.js`: 도서산간 지역
- `src/http/`: JSON API
- `src/dev/`: 로컬 실행과 시드 주문

## 실행

```bash
npm test
npm run dev        # http://localhost:4731
```

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/cart/summary` | `{ items: [{ sku, qty }], couponCode?, region? }` 금액 미리 보기 |
| POST | `/orders` | `{ customer, items: [{ sku, qty }], couponCode?, region }` 주문 |
| GET | `/orders/:id` | 주문 조회 |

오류는 `{ error, message }`로 돌려준다.

## 세금계산서와 원장

- `src/invoices/`: 주문으로 세금계산서를 만든다. 줄마다 공급가·할인·세액을 적는다
- `src/invoices/ledger.js`: 회계 원장 가져오기 형식(CSV)
- `scripts/export-ledger.js`: 시드 주문의 세금계산서를 원장 CSV로 찍는다. 운영은 월말 배치가 같은 형식으로 회계 시스템에 올린다

```bash
node scripts/export-ledger.js > ledger.csv
```

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/orders/:id/invoice` | 세금계산서 발행 |
| GET | `/ledger.csv` | 발행한 세금계산서의 원장 CSV |

## 반품 전표

- 반품은 수량이 음수인 전표(credit note)로 낸다. `app.invoices.credit(orderId, [{ sku, qty }])`
- 백오피스에서만 쓰므로 API 경로는 없다

## 배치 작업

- `config/jobs.json`: 작업 선언. 작업과 작업이 쓰는 구현을 `파일#이름`으로 적는다. 운영에서 구현을 바꿔 끼울 때 이 파일만 고친다
- `src/jobs/`: 실행기와 작업. `reconcile`은 주문 금액과 세금계산서 금액의 차이를 찾아 회계 조정 목록을 만든다
- `scripts/run-job.js`: 작업을 시드 주문으로 한 번 돌린다. 운영은 cron이 같은 명령을 부른다

```bash
node scripts/run-job.js reconcile
```
