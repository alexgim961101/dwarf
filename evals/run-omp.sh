#!/usr/bin/env bash
# fixture 하나를 omp 모델 하나로 실행하고 결과를 evals/results/에 남긴다. run.sh의 omp판. 산출물 모양이 같아 judge.sh에 섞어 넣을 수 있다.
# 사용: evals/run-omp.sh <fixture> <model> [반복 번호]     model은 provider 안의 모델 이름(gpt-6-luna 등). provider는 OMP_PROVIDER(기본 openai-codex)
# 환경 변수: OMP_THINKING(기본 medium), BUDGET_USD(세션 비용 상한, 기본 5. omp의 추정치), PHASE_TIMEOUT(단계당 초, 기본 2700),
#           KEEP_WS=1(작업 공간 남김), NO_SKILL=1(스킬 없음 기준선)
# 스킬: dwarf 모드는 --skills로 이 저장소의 skills/*만 보이게 하고 요청 앞의 /dwarf를 /skill:dwarf로 바꾼다. NO_SKILL=1이면 --no-skills.
#       omp에 설치된 다른 스킬은 두 모드 모두 보이지 않는다. 설치는 install.sh --tool omp.
# 세션은 결과 디렉토리 아래 sessions/에 두고 2단계는 -c로 잇는다. 사용자의 omp 세션 목록에는 남지 않는다.
# 관문 hook은 install.sh가 링크한 omp 확장(~/.omp/agent/extensions/dwarf-gate.ts)으로 걸린다. 확장 탐색을 끄지 않으므로 사용자의 다른 확장도 실린다.
# 스킬 없음 기준선에도 실리지만 /skill:dwarf가 없어 판정하지 않는다.
set -euo pipefail

EVALS_DIR=$(cd "$(dirname "$0")" && pwd)
export EVALS_DIR
fixture=${1:?사용: run-omp.sh fixture model [rep]}
model=${2:?omp 모델 이름(gpt-6-luna 등)}
rep=${3:-1}
F="$EVALS_DIR/fixtures/$fixture"
[ -d "$F" ] || { echo "fixture 없음: $fixture" >&2; exit 1; }
provider=${OMP_PROVIDER:-openai-codex}
thinking=${OMP_THINKING:-medium}
budget=${BUDGET_USD:-5}
limit=${PHASE_TIMEOUT:-2700}
timeout_cmd=$(command -v timeout || command -v gtimeout || true)
# 모든 단계에 무인 실행임을 알린다(skills/dwarf/references/headless.md).
headless_prompt="이 세션은 무인 실행이다. 사용자는 지금 답할 수 없고, 답은 다음 실행의 요청으로 온다."
skill=dwarf
suffix=
if [ "${NO_SKILL:-}" = 1 ]; then
  skill=none
  suffix=-noskill
else
  [ -e "$HOME/.omp/agent/skills/dwarf" ] || { echo "omp에 dwarf 스킬이 없다. ./install.sh --tool omp 를 먼저 실행한다." >&2; exit 1; }
  skills=$(for d in "$EVALS_DIR"/../skills/*/; do basename "$d"; done | paste -sd,)
fi

out="$EVALS_DIR/results/$(date +%Y%m%d-%H%M%S)-$fixture-$model-$rep$suffix"
mkdir -p "$out/state" "$out/sessions"
root=$(mktemp -d "${TMPDIR:-/tmp}/ws.XXXXXX")
ws="$root/$(cat "$F/project")"

# 작업 공간: fixture 저장소 복사본(workspace.sh). ws와 BASE가 설정된다.
. "$EVALS_DIR/workspace.sh"
make_workspace "$F" "$ws"

cleanup() {
  if [ -x "$F/hidden/post.sh" ]; then "$F/hidden/post.sh" "$ws" || true; fi
  if [ "${KEEP_WS:-}" = 1 ]; then echo "작업 공간: $ws"; else rm -rf "$root"; fi
}
trap cleanup EXIT

if [ -x "$F/hidden/pre.sh" ]; then "$F/hidden/pre.sh" "$ws" "$out/state"; fi

# phase 번호 프롬프트파일 [이어 가기]
phase() {
  local n=$1 prompt=$2 cont=${3:-} cmd=() text start
  text=$(cat "$prompt")
  case $text in
    "/dwarf "*) text=${text#/dwarf }; [ "$skill" = dwarf ] && text="/skill:dwarf $text" ;;
  esac
  [ -n "$timeout_cmd" ] && cmd=("$timeout_cmd" "$limit")
  cmd+=(omp -p --mode json --no-title --model "$provider/$model" --thinking "$thinking" --session-dir "$out/sessions"
    --append-system-prompt "$headless_prompt" --max-cost "$budget")
  if [ "$skill" = none ]; then cmd+=(--no-skills); else cmd+=(--skills "$skills"); fi
  [ -n "$cont" ] && cmd+=(-c)
  start=$SECONDS
  (cd "$ws" && "${cmd[@]}" "$text" </dev/null) >"$out/phase$n.jsonl" 2>"$out/phase$n.stderr" || true
  jq -n --argjson ms $(( (SECONDS - start) * 1000 )) '{duration_ms: $ms}' >"$out/phase$n.result.json"
  # 최종 보고: 글이 있는 마지막 assistant 메시지
  jq -rs '[.[] | select(.type=="message_end" and .message.role=="assistant") | select(any(.message.content[]?; .type=="text"))]
    | last | [.message.content[]? | select(.type=="text") | .text] | join("\n")' "$out/phase$n.jsonl" >"$out/phase$n.report.md" 2>/dev/null || : >"$out/phase$n.report.md"
  # 실행 기록: 도구 호출 순서. 판정 모델이 보고서 주장을 확인하는 데 쓴다.
  jq -r 'select(.type=="tool_execution_start")
    | .toolName + "\t" + ((.args.command // .args.path // .args.pattern // (.args | tostring)) | tostring | gsub("\n"; " ") | .[0:200])' \
    "$out/phase$n.jsonl" >"$out/phase$n.actions.txt" || true
  echo "## phase$n" >>"$out/checks.txt"
  "$F/hidden/check.sh" "$ws" "phase$n" "$out/state" >>"$out/checks.txt" 2>&1 || true
  # 상태 파일(references/state.md). 단계가 끝날 때의 상태를 남긴다. 스킬 없음 기준선에는 없다.
  cp "$ws/.docs/dwarf/state.md" "$out/phase$n.state.md" 2>/dev/null || true
  echo "INFO state-status $(sed -n 's/^status: *//p' "$out/phase$n.state.md" 2>/dev/null | head -1)" >>"$out/checks.txt"
}

phase 1 "$F/task.md"
sid=$(jq -r 'select(.type=="session") | .id' "$out/phase1.jsonl" | head -1)
if [ -f "$F/resume.md" ] && [ -n "$sid" ]; then phase 2 "$F/resume.md" continue; fi

# 결과물: 시작 커밋 대비 diff(새 파일 포함)와 커밋
git -C "$ws" add -N . 2>/dev/null || true
git -C "$ws" diff "$BASE" >"$out/diff.patch" || true
git -C "$ws" log --oneline "$BASE"..HEAD >"$out/commits.txt" || true

"$EVALS_DIR/meta-omp.sh" "$out" "$fixture" "$model" "$rep" "$skill" "$thinking" "$provider"
# 기준선이 dwarf 문서를 읽었으면 스킬이 꺼지지 않은 것이다. 그 실행은 기준선으로 쓰지 않는다.
if [ "$skill" = none ] && [ "$(jq -r '.docs_read | length' "$out/meta.json")" != 0 ]; then
  echo "경고: 스킬 없음 기준선이 dwarf 문서를 읽었다: $(jq -r '.docs_read | join(" ")' "$out/meta.json")" >&2
fi

echo "$out"
cat "$out/checks.txt"
jq -c '{skill, model, effort, total_cost_usd, leak_mentions, docs_read, tool_counts, phases: [.phases[] | {subtype, num_turns, cost_usd, tool_errors}]}' "$out/meta.json"
