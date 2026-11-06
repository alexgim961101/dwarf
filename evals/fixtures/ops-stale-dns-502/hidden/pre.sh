#!/usr/bin/env bash
# 옛 버전으로 띄워 둔 스택에 오늘 커밋을 deploy.sh로 배포한 상태를 만든다.
# api가 다시 만들어지며 IP가 바뀌도록, 비워진 옛 IP를 잠시 다른 컨테이너가 차지하게 한다.
set -eu
ws=$1 state=$2
cd "$ws"
docker compose up -d --wait >/dev/null 2>&1 || docker compose up -d >/dev/null
sleep 1
net=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$(docker compose ps -q api)")
docker compose stop api >/dev/null 2>&1
holder="ipholder-$$"
docker run -d --rm --network "$net" --name "$holder" alpine:3.20 sleep 300 >/dev/null
./deploy.sh >/dev/null 2>&1
docker rm -f "$holder" >/dev/null
sleep 1
curl -s -m 20 -o /dev/null "http://$(docker compose port web 80)/api/health" || true
docker compose ps -q | sort >"$state/containers.before"
