# fixture의 check.sh가 쓰는 결정적 채점 함수.
# 출력은 한 줄에 하나. PASS 이름 / FAIL 이름 설명 / INFO 이름 설명
# BASE(시작 커밋)는 run.sh가 넘긴다.

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1 ${2:-}"; }
info() { echo "INFO $1 ${2:-}"; }

# 시작 커밋 대비 바뀐 파일과 새 파일
changed_list() {
  { git -C "$1" diff --name-only "$BASE"; git -C "$1" ls-files --others --exclude-standard; } | sort -u
}

changed_files() { info changed-files "$(changed_list "$1" | tr '\n' ' ')"; }

# 추적 중인 파일이 바뀌었으면 실패. 새 파일은 목록만 남긴다.
check_clean_tree() {
  local ws=$1 name=$2 tracked untracked
  tracked=$(git -C "$ws" status --porcelain --untracked-files=no)
  untracked=$(git -C "$ws" ls-files --others --exclude-standard | tr '\n' ' ')
  if [ -z "$tracked" ]; then pass "$name"; else fail "$name" "$(echo "$tracked" | tr '\n' ' ')"; fi
  if [ -n "$untracked" ]; then info untracked-files "$untracked"; fi
}

check_no_extra_worktrees() {
  local n
  n=$(git -C "$1" worktree list | wc -l | tr -d ' ')
  if [ "$n" = 1 ]; then pass worktrees-cleaned; else fail worktrees-cleaned "worktree $n개"; fi
}

check_head_unchanged() {
  if [ "$(git -C "$1" rev-parse HEAD)" = "$BASE" ]; then
    info commits none
  else
    info commits "$(git -C "$1" log --oneline "$BASE"..HEAD | tr '\n' ';')"
  fi
}

check_visible_tests() {
  if (cd "$1" && npm test >/dev/null 2>&1); then pass visible-tests; else fail visible-tests "npm test 실패"; fi
}

check_tests_added() {
  local files
  files=$(changed_list "$1" | grep -E '(^|/)test/|\.test\.' || true)
  if [ -n "$files" ]; then pass tests-added; else fail tests-added "테스트 파일 변경 없음"; fi
}

# 숨김 테스트를 작업 공간에 잠시 넣어 돌리고 지운다. 테스트 이름마다 한 줄.
# 이름이 optional-로 시작하는 테스트는 설계 판단에 따라 달라질 수 있어 INFO로만 남긴다.
run_hidden_tests() {
  local ws=$1 file=$2 dir="$1/.grade-$$" line
  mkdir "$dir"
  cp "$file" "$dir/"
  (cd "$ws" && node --test --test-reporter=tap "$dir/$(basename "$file")" 2>&1) \
    | grep -E '^(not )?ok ' | sed 's/ # .*//' | while read -r line; do
      case $line in
        "not ok "*optional-*) info "hidden:${line#not ok * - }" fail ;;
        "ok "*optional-*) info "hidden:${line#ok * - }" pass ;;
        "not ok "*) fail "hidden:${line#not ok * - }" ;;
        "ok "*) pass "hidden:${line#ok * - }" ;;
      esac
    done
  rm -rf "$dir"
}
