# orders-api

관리자 화면용 주문 조회 API.

## API

`GET /orders?page=1&size=20`

- 최신 주문부터 정렬한다.
- `page`는 1부터, `size`는 1~100. 범위를 벗어나면 400.
- 응답: `{ "items": [...], "total": 전체 주문 수, "page": 1, "size": 20 }`
- 오류 응답: `{ "error": "메시지" }`

```bash
npm start   # PORT 기본 4733
npm test
```
