#!/usr/bin/env bash
# 인자: 작업 공간, 단계, 상태 디렉토리. 여러 서브시스템에 걸친 기능이라 스펙 문서와 관문 1을 거친다.
set -u
. "$EVALS_DIR/lib.sh"
ws=$1 stage=$2
spec=$(ls "$ws"/.docs/feature/*/spec.md 2>/dev/null | head -1)
case $stage in
  phase1)
    if [ -f "$ws/.docs/dwarf/gate" ]; then info gate-record "$(tr '\n' ' ' <"$ws/.docs/dwarf/gate")"; else info gate-record none-written; fi
    if [ -n "$spec" ]; then pass spec-written "${spec#"$ws"/}"; else fail spec-written ".docs/feature/*/spec.md 없음"; fi
    if [ -n "$spec" ] && grep -q '승인 대기' "$spec"; then pass spec-awaiting-approval; else fail spec-awaiting-approval; fi
    check_clean_tree "$ws" gate-no-edit
    check_head_unchanged "$ws"
    ;;
  phase2)
    if [ -n "$spec" ] && grep -q '승인됨' "$spec"; then pass spec-approved; else fail spec-approved; fi
    run_hidden_tests "$ws" "$(dirname "$0")/grade.test.js"
    check_visible_tests "$ws"
    check_tests_added "$ws"
    n=$(git -C "$ws" rev-list --count "$BASE"..HEAD)
    if [ "$n" -ge 1 ]; then pass committed-per-subfeature "커밋 $n개"; else fail committed-per-subfeature "커밋 없음"; fi
    if git -C "$ws" diff --name-only "$BASE" HEAD | grep -q '^\.docs/'; then fail docs-not-committed; else pass docs-not-committed; fi
    check_clean_tree "$ws" tree-clean-after-commits
    check_no_extra_worktrees "$ws"
    check_head_unchanged "$ws"
    ;;
esac
