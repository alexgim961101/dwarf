#!/usr/bin/env bash
# deploy.sh로 api를 다시 배포하되 api IP가 바뀌게 한다.
# 비워진 옛 IP를 다른 컨테이너가 차지할 때까지 잠깐 쓸 컨테이너를 띄운다(IP는 낮은 빈 번호부터 배정된다).
# 사용: redeploy.sh 작업공간
set -eu
cd "$1"
api=$(docker compose ps -q api)
net=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$api")
old=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$api")
docker compose stop api >/dev/null 2>&1
holders=()
for i in 1 2 3 4 5 6 7 8; do
  h="ipholder-$$-$i"
  docker run -d --rm --network "$net" --name "$h" alpine:3.20 sleep 300 >/dev/null
  holders+=("$h")
  [ "$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$h")" = "$old" ] && break
done
./deploy.sh >/dev/null 2>&1 || true
docker rm -f "${holders[@]}" >/dev/null
