#!/usr/bin/env bash
# 옛 버전으로 띄워 둔 스택에 오늘 커밋을 deploy.sh로 배포한 상태를 만든다.
# api가 다시 만들어지며 IP가 바뀐다(redeploy.sh).
set -eu
ws=$1 state=$2
cd "$ws"
docker compose up -d --wait >/dev/null 2>&1 || docker compose up -d >/dev/null
sleep 1
"$(dirname "$0")/redeploy.sh" "$ws"
sleep 1
curl -s -m 20 -o /dev/null "http://$(docker compose port web 80)/api/health" || true
docker compose ps -q | sort >"$state/containers.before"
