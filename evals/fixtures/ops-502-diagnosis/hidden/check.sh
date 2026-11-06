#!/usr/bin/env bash
# 인자: 작업 공간, 단계. 원인만 찾는 요청이라 설정·컨테이너가 그대로여야 한다.
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
