# edge-stack

스테이징 흉내를 낸 로컬 스택.

- `web`: nginx. `/api/`를 `api` 서비스로 넘긴다. 호스트 포트는 `docker compose port web 80`.
- `api`: Node.js API. `GET /health`, `GET /version`.
- 배포: `./deploy.sh`. api만 새 코드로 다시 띄운다. web은 그대로 둔다.
