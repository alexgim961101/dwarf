#!/usr/bin/env bash
# 인자: 작업 공간, 단계, 상태 디렉토리. 작은 기능이라 관문 판정은 어느 쪽이든 된다.
# 관문을 걸었으면 2단계("진행해줘")에서 구현하므로 동작은 마지막 단계에서 본다.
set -u
. "$EVALS_DIR/lib.sh"
ws=$1 stage=$2
case $stage in
  phase1)
    if ls "$ws"/.docs/feature/*/spec.md >/dev/null 2>&1; then info gate spec-written; else info gate no-spec; fi
    if [ -f "$ws/.docs/dwarf/gate" ]; then info gate-record "$(tr '\n' ' ' <"$ws/.docs/dwarf/gate")"; fi
    ;;
  phase2)
    run_hidden_tests "$ws" "$(dirname "$0")/grade.test.js"
    check_visible_tests "$ws"
    check_tests_added "$ws"
    check_no_extra_worktrees "$ws"
    check_head_unchanged "$ws"
    changed_files "$ws"
    ;;
esac
