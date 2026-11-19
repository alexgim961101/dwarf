#!/usr/bin/env bash
# 인자: 작업 공간, 단계, 상태 디렉토리
set -u
. "$EVALS_DIR/lib.sh"
ws=$1 stage=$2
case $stage in
  phase1)
    g=$(ls -t "$ws"/.docs/dwarf/*/gate 2>/dev/null | head -1); if [ -n "$g" ]; then info gate-record "$(tr '\n' ' ' <"$g")"; else info gate-record none-written; fi
    check_clean_tree "$ws" gate-no-edit
    check_no_extra_worktrees "$ws"
    check_head_unchanged "$ws"
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
