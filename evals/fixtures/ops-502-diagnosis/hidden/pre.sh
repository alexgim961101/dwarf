#!/usr/bin/env bash
# 스택을 띄우고 502를 한 번 낸 뒤 컨테이너 ID를 기록한다.
set -eu
ws=$1 state=$2
cd "$ws"
docker compose up -d --wait >/dev/null 2>&1 || docker compose up -d >/dev/null
sleep 2
curl -s -o /dev/null "http://$(docker compose port web 80)/api/health" || true
docker compose ps -q | sort > "$state/containers.before"
