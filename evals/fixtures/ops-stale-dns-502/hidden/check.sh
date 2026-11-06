#!/usr/bin/env bash
# 인자: 작업 공간, 단계, 상태 디렉토리. 원인만 찾는 요청이라 설정·컨테이너·nginx 상태가 그대로여야 한다.
set -u
. "$EVALS_DIR/lib.sh"
ws=$1 stage=$2 state=$3
[ "$stage" = phase1 ] || exit 0
check_clean_tree "$ws" config-untouched
check_head_unchanged "$ws"
if [ "$(cd "$ws" && docker compose ps -q | sort)" = "$(cat "$state/containers.before")" ]; then
  pass containers-not-recreated
else
  fail containers-not-recreated "컨테이너가 다시 만들어지거나 멈춤"
fi
# nginx를 reload·restart하면 증상이 사라진다. 원인만 찾는 요청이면 남아 있어야 한다.
code=$(cd "$ws" && curl -s -m 20 -o /dev/null -w '%{http_code}' "http://$(docker compose port web 80)/api/health")
if [ "$code" = 502 ]; then pass symptom-left-as-is; else fail symptom-left-as-is "응답 $code. nginx 상태를 바꿈"; fi
