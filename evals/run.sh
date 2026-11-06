#!/usr/bin/env bash
# fixture 하나를 모델 하나로 실행하고 결과를 evals/results/에 남긴다.
# 사용: evals/run.sh <fixture> <model> [반복 번호]
# 환경 변수: BUDGET_USD(단계당 비용 상한, 기본 5), PHASE_TIMEOUT(단계당 초, 기본 2700), KEEP_WS=1(작업 공간 남김)
set -euo pipefail

EVALS_DIR=$(cd "$(dirname "$0")" && pwd)
export EVALS_DIR
fixture=${1:?사용: run.sh fixture model [rep]}
model=${2:?모델(haiku, sonnet, opus 등)}
rep=${3:-1}
F="$EVALS_DIR/fixtures/$fixture"
[ -d "$F" ] || { echo "fixture 없음: $fixture" >&2; exit 1; }
budget=${BUDGET_USD:-5}
limit=${PHASE_TIMEOUT:-2700}
timeout_cmd=$(command -v timeout || command -v gtimeout || true)

out="$EVALS_DIR/results/$(date +%Y%m%d-%H%M%S)-$fixture-$model-$rep"
mkdir -p "$out/state"
root=$(mktemp -d "${TMPDIR:-/tmp}/ws.XXXXXX")
ws="$root/$(cat "$F/project")"

# 작업 공간: fixture 저장소 복사본. 채점 자료(hidden, rubric)는 넣지 않는다.
cp -R "$F/repo" "$ws"
ws=$(cd "$ws" && pwd -P)
git -C "$ws" init -q
if [ -x "$F/hidden/history.sh" ]; then
  "$F/hidden/history.sh" "$ws"
else
  git -C "$ws" add -A
  git -C "$ws" -c user.name=dev -c user.email=dev@example.com commit -qm "initial"
fi
BASE=$(git -C "$ws" rev-parse HEAD)
export BASE

cleanup() {
  if [ -x "$F/hidden/post.sh" ]; then "$F/hidden/post.sh" "$ws" || true; fi
  # 이 실행이 만든 Claude Code 프로젝트 기록(세션·메모리)
  rm -rf "$HOME/.claude/projects/$(printf %s "$ws" | sed 's#[^A-Za-z0-9]#-#g')"
  # 관문 hook의 세션 상태
  for r in "$out"/phase*.result.json; do
    s=$(jq -r '.session_id // empty' "$r" 2>/dev/null)
    [ -n "$s" ] && rm -f "${TMPDIR:-/tmp}/dwarf-gate/$s.json"
  done
  if [ "${KEEP_WS:-}" = 1 ]; then echo "작업 공간: $ws"; else rm -rf "$root"; fi
}
trap cleanup EXIT

if [ -x "$F/hidden/pre.sh" ]; then "$F/hidden/pre.sh" "$ws" "$out/state"; fi

# phase 번호 프롬프트파일 [세션ID]
phase() {
  local n=$1 prompt=$2 sid=${3:-} cmd=()
  [ -n "$timeout_cmd" ] && cmd=("$timeout_cmd" "$limit")
  cmd+=(claude -p --model "$model" --permission-mode auto --max-budget-usd "$budget"
    --output-format stream-json --verbose)
  [ -n "$sid" ] && cmd+=(--resume "$sid")
  (cd "$ws" && "${cmd[@]}" "$(cat "$prompt")" </dev/null) >"$out/phase$n.jsonl" 2>"$out/phase$n.stderr" || true
  jq -c 'select(.type=="result")' "$out/phase$n.jsonl" | tail -1 >"$out/phase$n.result.json"
  jq -r '.result // ""' "$out/phase$n.result.json" >"$out/phase$n.report.md"
  # 실행 기록: 도구 호출 순서. 판정 모델이 보고서 주장을 확인하는 데 쓴다.
  jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use")
    | .name + "\t" + ((.input.command // .input.file_path // .input.pattern // .input.skill // "")
    | tostring | gsub("\n"; " ") | .[0:200])' "$out/phase$n.jsonl" >"$out/phase$n.actions.txt" || true
  echo "## phase$n" >>"$out/checks.txt"
  "$F/hidden/check.sh" "$ws" "phase$n" "$out/state" >>"$out/checks.txt" 2>&1 || true
}

phase 1 "$F/task.md"
sid=$(jq -r '.session_id // empty' "$out/phase1.result.json")
if [ -f "$F/resume.md" ] && [ -n "$sid" ]; then phase 2 "$F/resume.md" "$sid"; fi

# 결과물: 시작 커밋 대비 diff(새 파일 포함)와 커밋
git -C "$ws" add -N . 2>/dev/null || true
git -C "$ws" diff "$BASE" >"$out/diff.patch" || true
git -C "$ws" log --oneline "$BASE"..HEAD >"$out/commits.txt" || true

"$EVALS_DIR/meta.sh" "$out" "$fixture" "$model" "$rep"

echo "$out"
cat "$out/checks.txt"
jq -c '{total_cost_usd, leak_mentions, docs_read, tool_counts, phases: [.phases[] | {subtype, num_turns, cost_usd, denials}]}' "$out/meta.json"
