#!/usr/bin/env bash
# dwarf 관문 hook(skills/dwarf/hooks/gate.py)을 hook 입력 JSON으로 직접 불러 판정을 확인한다.
# 사용: tests/gate-hook.sh   (git, python3, jq 필요. 임시 디렉토리에서만 작업한다)
set -u
HOOK=$(cd "$(dirname "$0")/.." && pwd)/skills/dwarf/hooks/gate.py
tmp=$(mktemp -d)
export TMPDIR="$tmp/t" CLAUDE_PROJECT_DIR="$tmp/repo"
mkdir -p "$TMPDIR" "$CLAUDE_PROJECT_DIR/src"
cd "$CLAUDE_PROJECT_DIR"
git init -q && echo a >src/a.js && git add -A && git -c user.name=t -c user.email=t@t commit -qm init
fails=0
sid=s1

call() {  # call 이벤트 도구 파일경로 [내용]
  jq -nc --arg e "$1" --arg t "$2" --arg f "$3" --arg c "${4:-}" --arg s "$sid" --arg cwd "$CLAUDE_PROJECT_DIR" \
    '{hook_event_name: $e, session_id: $s, cwd: $cwd, tool_name: $t, tool_input: {file_path: $f, content: $c, command: $f}}' \
    | python3 "$HOOK"
}
decision() {  # hook이 아무것도 내지 않으면 허용
  local out
  out=$(call "$@")
  if [ -z "$out" ]; then echo allow; else echo "$out" | jq -r '.hookSpecificOutput.permissionDecision // "allow"'; fi
}
expect() {  # expect 설명 기대값 실제값
  if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: 기대 $2, 실제 $3"; fails=$((fails + 1)); fi
}
gate="$CLAUDE_PROJECT_DIR/.docs/dwarf/gate"
write_gate() { mkdir -p "$(dirname "$gate")"; printf '%s' "$1" >"$gate"; }

expect "기록 없으면 작업 트리 수정 막음" deny "$(decision PreToolUse Edit "$CLAUDE_PROJECT_DIR/src/a.js")"
expect "작업 트리 밖은 허용" allow "$(decision PreToolUse Write "$tmp/outside.js")"
expect ".docs 아래는 허용" allow "$(decision PreToolUse Write "$CLAUDE_PROJECT_DIR/.docs/feature/x/spec.md")"
git worktree add -q -b wt-test "$CLAUDE_PROJECT_DIR/worktrees/x"
expect "작업 트리 안 다른 worktree는 허용" allow "$(decision PreToolUse Write "$CLAUDE_PROJECT_DIR/worktrees/x/src/a.js")"
expect "answered는 모델이 못 씀" deny "$(decision PreToolUse Write "$gate" $'status: answered\nplaybook: bug-fix\nreason: x')"
expect "pending 없이 approved 못 씀" deny "$(decision PreToolUse Write "$gate" $'status: approved\nplaybook: bug-fix\nreason: x')"
expect "bug-fix는 none 못 씀" deny "$(decision PreToolUse Write "$gate" $'status: none\nplaybook: bug-fix\nreason: x')"
expect "none은 이유 필요" deny "$(decision PreToolUse Write "$gate" $'status: none\nplaybook: chore\nreason:')"
expect "pending 기록 허용" allow "$(decision PreToolUse Write "$gate" $'status: pending\nplaybook: bug-fix\nreason: 후보 비교 보고')"
write_gate $'status: pending\nplaybook: bug-fix\nreason: 후보 비교 보고\n'
expect "pending이면 수정 막음" deny "$(decision PreToolUse Edit "$CLAUDE_PROJECT_DIR/src/a.js")"
expect "pending 중 같은 턴 approved 못 씀" deny "$(decision PreToolUse Write "$gate" $'status: approved\nplaybook: bug-fix\nreason: x')"
echo b >>src/a.js
call PostToolUse Bash "echo b >> src/a.js" >/dev/null 2>&1
expect "Bash로 바꾸면 PostToolUse가 알림(exit 2)" 2 "$?"
git checkout -q src/a.js
call PostToolUse Bash "git checkout src/a.js" >/dev/null 2>&1
expect "되돌리면 알림 없음" 0 "$?"
out=$(call UserPromptSubmit "" "")
expect "사용자가 답하면 answered로 바뀜" "status: answered" "$(head -1 "$gate")"
expect "answered 안내를 맥락에 넣음" yes "$(echo "$out" | grep -q answered && echo yes || echo no)"
expect "answered 뒤 approved 허용" allow "$(decision PreToolUse Write "$gate" $'status: approved\nplaybook: bug-fix\nreason: 후보 A')"
expect "approved면 수정 허용" allow "$(decision PreToolUse Edit "$CLAUDE_PROJECT_DIR/src/a.js")"
sid=s2
expect "다른 세션은 남은 기록을 믿지 않음" deny "$(decision PreToolUse Edit "$CLAUDE_PROJECT_DIR/src/a.js")"
expect "none과 이유면 허용" allow "$(decision PreToolUse Write "$gate" $'status: none\nplaybook: chore\nreason: 정해진 의존성 갱신')"
expect "none이면 수정 허용" allow "$(decision PreToolUse Edit "$CLAUDE_PROJECT_DIR/src/a.js")"

git worktree remove --force "$CLAUDE_PROJECT_DIR/worktrees/x"
rm -rf "$tmp"
echo "실패 $fails개"
[ "$fails" = 0 ]
