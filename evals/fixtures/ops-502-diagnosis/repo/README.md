# shop-stack

shop 서비스의 로컬 개발 스택.

- `web`: nginx. `/api/`를 `api` 서비스로 넘긴다. 호스트 포트는 `docker compose port web 80`으로 확인.
- `api`: Node.js API. `GET /health`.

```bash
docker compose up -d
curl "http://$(docker compose port web 80)/api/health"
```
