#!/usr/bin/env bash
# fixture 하나를 Codex CLI 모델 하나로 실행하고 결과를 evals/results/에 남긴다. run.sh의 Codex판. 산출물 모양이 같아 judge.sh에 섞어 넣을 수 있다.
# 사용: evals/run-codex.sh <fixture> <model> [반복 번호]     model은 Codex 모델 id(gpt-6-luna 등)
# 환경 변수: CODEX_EFFORT(model_reasoning_effort, 기본 medium), CODEX_SANDBOX(workspace-write(기본) 또는 danger-full-access),
#           PHASE_TIMEOUT(단계당 초, 기본 2700), KEEP_WS=1(작업 공간 남김), NO_SKILL=1(스킬 없음 기준선)
# 실행마다 임시 CODEX_HOME을 만들어 로그인 정보(auth.json)만 복사한다. 사용자의 설정·AGENTS.md·메모리·세션은 쓰지 않는다.
# dwarf 모드는 이 저장소의 skills/*를 그 안에 링크하고 요청 앞의 /dwarf를 $dwarf(Codex 스킬 멘션)로 바꾼다.
# 임시 CODEX_HOME에는 hooks.json을 두지 않아 관문 hook이 걸리지 않는다. 승인 전 무변경은 규칙만으로 지켜진다.
set -euo pipefail

EVALS_DIR=$(cd "$(dirname "$0")" && pwd)
export EVALS_DIR
fixture=${1:?사용: run-codex.sh fixture model [rep]}
model=${2:?Codex 모델 id(gpt-6-luna 등)}
rep=${3:-1}
F="$EVALS_DIR/fixtures/$fixture"
[ -d "$F" ] || { echo "fixture 없음: $fixture" >&2; exit 1; }
effort=${CODEX_EFFORT:-medium}
sandbox=${CODEX_SANDBOX:-workspace-write}
case $sandbox in
  workspace-write|danger-full-access) ;;
  *) echo "CODEX_SANDBOX는 workspace-write 또는 danger-full-access" >&2; exit 1 ;;
esac
limit=${PHASE_TIMEOUT:-2700}
timeout_cmd=$(command -v timeout || command -v gtimeout || true)
src_home=${CODEX_HOME:-$HOME/.codex}
[ -f "$src_home/auth.json" ] || { echo "Codex 로그인 정보 없음: $src_home/auth.json" >&2; exit 1; }
# 모든 단계에 무인 실행임을 알린다(skills/dwarf/references/headless.md). run.sh의 --append-system-prompt 대신 CODEX_HOME/AGENTS.md에 둔다.
headless_prompt="이 세션은 무인 실행이다. 사용자는 지금 답할 수 없고, 답은 다음 실행의 요청으로 온다."
skill=dwarf
suffix=
if [ "${NO_SKILL:-}" = 1 ]; then skill=none; suffix=-noskill; fi

out="$EVALS_DIR/results/$(date +%Y%m%d-%H%M%S)-$fixture-$model-$rep$suffix"
mkdir -p "$out/state"
root=$(mktemp -d "${TMPDIR:-/tmp}/ws.XXXXXX")
ws="$root/$(cat "$F/project")"

# 격리된 CODEX_HOME. /tmp 아래에 두면 codex가 helper 설치를 거부하고 경고하므로 결과 디렉토리 아래에 두고 끝나면 지운다.
home="$out/codex-home"
mkdir -m 700 "$home"
install -m 600 "$src_home/auth.json" "$home/auth.json"
touch "$home/.auth-copied"
printf '%s\n' "$headless_prompt" >"$home/AGENTS.md"
if [ "$skill" = dwarf ]; then
  mkdir "$home/skills"
  for d in "$EVALS_DIR"/../skills/*/; do ln -s "$(cd "$d" && pwd -P)" "$home/skills/$(basename "$d")"; done
fi
export CODEX_HOME="$home"

# 작업 공간: fixture 저장소 복사본(workspace.sh). ws와 BASE가 설정된다.
. "$EVALS_DIR/workspace.sh"
make_workspace "$F" "$ws"

cleanup() {
  if [ -x "$F/hidden/post.sh" ]; then "$F/hidden/post.sh" "$ws" || true; fi
  # codex가 복사본의 로그인 토큰을 갱신했으면 원본에 되돌려 둔다. 그 사이 원본도 바뀌었으면 건드리지 않고 알린다.
  if [ "$home/auth.json" -nt "$home/.auth-copied" ]; then
    if [ "$src_home/auth.json" -nt "$home/.auth-copied" ]; then
      echo "경고: 실행 중 Codex 로그인 토큰이 복사본과 원본에서 모두 갱신됐다. codex 로그인 상태를 확인한다." >&2
    else
      install -m 600 "$home/auth.json" "$src_home/auth.json"
      echo "Codex 로그인 토큰이 갱신되어 $src_home/auth.json 에 되돌려 두었다." >&2
    fi
  fi
  rm -rf "$home"
  if [ "${KEEP_WS:-}" = 1 ]; then echo "작업 공간: $ws"; else rm -rf "$root"; fi
}
trap cleanup EXIT

if [ -x "$F/hidden/pre.sh" ]; then "$F/hidden/pre.sh" "$ws" "$out/state"; fi

# phase 번호 프롬프트파일 [thread id]
phase() {
  local n=$1 prompt=$2 tid=${3:-} cmd=() text start
  text=$(cat "$prompt")
  case $text in
    "/dwarf "*) text=${text#/dwarf }; [ "$skill" = dwarf ] && text="\$dwarf $text" ;;
  esac
  [ -n "$timeout_cmd" ] && cmd=("$timeout_cmd" "$limit")
  # --no-daemon: 공유 app-server를 쓰지 않는다. 격리된 CODEX_HOME을 그대로 쓰고, 명령이 이 터미널 안에서 실행된다(hc 매뉴얼).
  cmd+=(codex --no-daemon exec)
  [ -n "$tid" ] && cmd+=(resume)
  cmd+=(--json -m "$model" -c "model_reasoning_effort=\"$effort\"" -c "sandbox_mode=\"$sandbox\"" -c "approval_policy=\"never\""
    -o "$out/phase$n.report.md")
  [ -n "$tid" ] && cmd+=("$tid")
  start=$SECONDS
  (cd "$ws" && "${cmd[@]}" "$text" </dev/null) >"$out/phase$n.jsonl" 2>"$out/phase$n.stderr" || true
  jq -n --argjson ms $(( (SECONDS - start) * 1000 )) '{duration_ms: $ms}' >"$out/phase$n.result.json"
  [ -f "$out/phase$n.report.md" ] || : >"$out/phase$n.report.md"
  # 실행 기록: 명령과 파일 변경 순서. 판정 모델이 보고서 주장을 확인하는 데 쓴다.
  jq -r 'select(.type=="item.completed") | .item | select(.type=="command_execution" or .type=="file_change")
    | .type + "\t" + ((.command // ((.changes // []) | map((.kind // "") + " " + (.path // "")) | join(", ")))
    | tostring | gsub("\n"; " ") | .[0:200])' "$out/phase$n.jsonl" >"$out/phase$n.actions.txt" || true
  echo "## phase$n" >>"$out/checks.txt"
  "$F/hidden/check.sh" "$ws" "phase$n" "$out/state" >>"$out/checks.txt" 2>&1 || true
  # 상태 파일(references/state.md). 단계가 끝날 때의 상태를 남긴다. 스킬 없음 기준선에는 없다.
  cp "$ws/.docs/dwarf/state.md" "$out/phase$n.state.md" 2>/dev/null || true
  echo "INFO state-status $(sed -n 's/^status: *//p' "$out/phase$n.state.md" 2>/dev/null | head -1)" >>"$out/checks.txt"
}

phase 1 "$F/task.md"
tid=$(jq -r 'select(.type=="thread.started") | .thread_id' "$out/phase1.jsonl" | head -1)
if [ -f "$F/resume.md" ] && [ -n "$tid" ]; then phase 2 "$F/resume.md" "$tid"; fi

# 결과물: 시작 커밋 대비 diff(새 파일 포함)와 커밋
git -C "$ws" add -N . 2>/dev/null || true
git -C "$ws" diff "$BASE" >"$out/diff.patch" || true
git -C "$ws" log --oneline "$BASE"..HEAD >"$out/commits.txt" || true

"$EVALS_DIR/meta-codex.sh" "$out" "$fixture" "$model" "$rep" "$skill" "$effort"

echo "$out"
cat "$out/checks.txt"
jq -c '{skill, model, effort, total_tokens, leak_mentions, docs_read, tool_counts, phases: [.phases[] | {subtype, num_turns, tokens, denials}]}' "$out/meta.json"
