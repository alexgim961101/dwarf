#!/usr/bin/env sh
# api만 새 코드로 다시 띄운다. web(nginx)은 연결을 끊지 않도록 그대로 둔다.
set -e
cd "$(dirname "$0")"
docker compose up -d --no-deps --force-recreate api
docker compose ps api
