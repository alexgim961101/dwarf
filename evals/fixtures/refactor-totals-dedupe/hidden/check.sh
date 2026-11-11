#!/usr/bin/env bash
# 인자: 작업 공간, 단계, 상태 디렉토리. 한 번에 끝내는 요청이라 단계가 하나다.
# 숨김 테스트는 바꾸기 전 저장소(repo/)와 작업 공간의 결과를 비교하므로 ORIGINAL_REPO를 넘긴다.
set -u
. "$EVALS_DIR/lib.sh"
ws=$1 stage=$2
[ "$stage" = phase1 ] || exit 0
ORIGINAL_REPO=$(cd "$(dirname "$0")/../repo" && pwd)
export ORIGINAL_REPO
if [ -f "$ws/.docs/dwarf/gate" ]; then info gate-record "$(tr '\n' ' ' <"$ws/.docs/dwarf/gate")"; fi
run_hidden_tests "$ws" "$(dirname "$0")/grade.test.js"
check_visible_tests "$ws"
check_tests_added "$ws"
check_no_extra_worktrees "$ws"
check_head_unchanged "$ws"
changed_files "$ws"
