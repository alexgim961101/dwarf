#!/usr/bin/env bash
# fixture 하나를 모델 하나로 실행하고 결과를 evals/results/에 남긴다.
# 사용: evals/run.sh <fixture> <model> [반복 번호]
# 환경 변수: BUDGET_USD(단계당 비용 상한, 기본 5), PHASE_TIMEOUT(단계당 초, 기본 2700), KEEP_WS=1(작업 공간 남김),
#           NO_SKILL=1(스킬 없음 기준선. 요청 앞의 /dwarf를 떼고 이 저장소의 스킬을 모두 끈 채 같은 요청을 실행)
#           PSTACK_DIR=<경로>(pstack 비교 실행. 이 저장소의 스킬을 모두 끄고 그 경로의 Claude Code 플러그인을 실어
#                            /dwarf 대신 /pstack:poteto-mode로 같은 요청을 실행. evals/ 밖에 둔다)
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
# --resume에는 skill hook이 다시 등록되지 않는다. 2단계에는 라우터 frontmatter의 hooks(줄마다 JSON 값)를 settings로 넘긴다.
hooks=$(sed -n '/^hooks:$/,/^---$/s/^  \(".*\)$/\1/p' "$EVALS_DIR/../skills/dwarf/SKILL.md" \
  | paste -sd, - | sed 's/.*/{"hooks": {&}}/' | jq -c .)
# 모든 단계에 무인 실행임을 알린다(skills/dwarf/references/headless.md).
headless_prompt="이 세션은 무인 실행이다. 사용자는 지금 답할 수 없고, 답은 다음 실행의 요청으로 온다."
# 스킬 없음 기준선과 pstack 비교 실행: skills/*/를 전부 끈다(skillOverrides). 스킬을 부르지 않으므로 관문 hook도 걸리지 않는다.
skill=dwarf
suffix=
if [ "${NO_SKILL:-}" = 1 ]; then
  skill=none
  suffix=-noskill
elif [ -n "${PSTACK_DIR:-}" ]; then
  [ -f "$PSTACK_DIR/.claude-plugin/plugin.json" ] || { echo "pstack 플러그인 없음: $PSTACK_DIR" >&2; exit 1; }
  PSTACK_DIR=$(cd "$PSTACK_DIR" && pwd -P)
  # 플러그인 경로는 실행 기록에 남는다. evals/ 아래면 모든 실행이 유출로 잡힌다.
  case $PSTACK_DIR/ in "$EVALS_DIR"/*) echo "PSTACK_DIR은 evals/ 밖에 둔다: $PSTACK_DIR" >&2; exit 1 ;; esac
  skill=pstack
  suffix=-pstack
fi
if [ "$skill" != dwarf ]; then
  overrides=$(for d in "$EVALS_DIR"/../skills/*/; do basename "$d"; done \
    | jq -R . | jq -sc 'map({(.): "off"}) | add | {skillOverrides: .}')
fi

out="$EVALS_DIR/results/$(date +%Y%m%d-%H%M%S)-$fixture-$model-$rep$suffix"
mkdir -p "$out/state"
root=$(mktemp -d "${TMPDIR:-/tmp}/ws.XXXXXX")
ws="$root/$(cat "$F/project")"

# 작업 공간: fixture 저장소 복사본(workspace.sh). ws와 BASE가 설정된다.
. "$EVALS_DIR/workspace.sh"
make_workspace "$F" "$ws"

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
  local n=$1 prompt=$2 sid=${3:-} cmd=() text
  text=$(cat "$prompt")
  # 호출 표기만 바꾼다. 이어 가는 말(resume.md)에는 표기가 없어 그대로 간다.
  case $skill:$text in
    none:"/dwarf "*) text=${text#/dwarf } ;;
    pstack:"/dwarf "*) text="/pstack:poteto-mode ${text#/dwarf }" ;;
  esac
  [ -n "$timeout_cmd" ] && cmd=("$timeout_cmd" "$limit")
  cmd+=(claude -p --model "$model" --permission-mode auto --max-budget-usd "$budget"
    --output-format stream-json --verbose --append-system-prompt "$headless_prompt")
  if [ "$skill" != dwarf ]; then cmd+=(--settings "$overrides")
  elif [ -n "$sid" ]; then cmd+=(--settings "$hooks"); fi
  if [ "$skill" = pstack ]; then cmd+=(--plugin-dir "$PSTACK_DIR"); fi
  [ -n "$sid" ] && cmd+=(--resume "$sid")
  (cd "$ws" && "${cmd[@]}" "$text" </dev/null) >"$out/phase$n.jsonl" 2>"$out/phase$n.stderr" || true
  jq -c 'select(.type=="result")' "$out/phase$n.jsonl" | tail -1 >"$out/phase$n.result.json"
  jq -r '.result // ""' "$out/phase$n.result.json" >"$out/phase$n.report.md"
  # 실행 기록: 도구 호출 순서. 판정 모델이 보고서 주장을 확인하는 데 쓴다.
  jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use")
    | .name + "\t" + ((.input.command // .input.file_path // .input.pattern // .input.skill // "")
    | tostring | gsub("\n"; " ") | .[0:200])' "$out/phase$n.jsonl" >"$out/phase$n.actions.txt" || true
  echo "## phase$n" >>"$out/checks.txt"
  "$F/hidden/check.sh" "$ws" "phase$n" "$out/state" >>"$out/checks.txt" 2>&1 || true
  # 상태 파일(references/state.md). 단계가 끝날 때의 상태를 남긴다. 스킬 없음 기준선에는 없다.
  cp "$ws/.docs/dwarf/state.md" "$out/phase$n.state.md" 2>/dev/null || true
  echo "INFO state-status $(sed -n 's/^status: *//p' "$out/phase$n.state.md" 2>/dev/null | head -1)" >>"$out/checks.txt"
}

phase 1 "$F/task.md"
sid=$(jq -r '.session_id // empty' "$out/phase1.result.json")
if [ -f "$F/resume.md" ] && [ -n "$sid" ]; then phase 2 "$F/resume.md" "$sid"; fi

# 결과물: 시작 커밋 대비 diff(새 파일 포함)와 커밋
git -C "$ws" add -N . 2>/dev/null || true
git -C "$ws" diff "$BASE" >"$out/diff.patch" || true
git -C "$ws" log --oneline "$BASE"..HEAD >"$out/commits.txt" || true

"$EVALS_DIR/meta.sh" "$out" "$fixture" "$model" "$rep" "$skill"
# 기준선이 dwarf 문서를 읽었으면 스킬이 꺼지지 않은 것이다. 그 실행은 기준선으로 쓰지 않는다.
if [ "$skill" = none ] && [ "$(jq -r '.docs_read | length' "$out/meta.json")" != 0 ]; then
  echo "경고: 스킬 없음 기준선이 dwarf 문서를 읽었다: $(jq -r '.docs_read | join(" ")' "$out/meta.json")" >&2
fi
# pstack 실행의 docs_read에는 pstack 문서가 들어간다. dwarf 라우터를 읽었으면 섞인 실행이라 쓰지 않는다.
if [ "$skill" = pstack ] && jq -c 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | .input' \
  "$out"/phase*.jsonl | grep -q 'skills/dwarf/'; then
  echo "경고: pstack 실행이 dwarf 문서를 읽었다" >&2
fi

echo "$out"
cat "$out/checks.txt"
jq -c '{skill, total_cost_usd, leak_mentions, docs_read, tool_counts, phases: [.phases[] | {subtype, num_turns, cost_usd, denials}]}' "$out/meta.json"
