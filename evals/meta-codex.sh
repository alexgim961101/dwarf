#!/usr/bin/env bash
# Codex 실행 디렉토리의 기록(codex exec --json)으로 meta.json과 phaseN.trace.txt를 만든다. run-codex.sh가 부르고, 기록만 남은 실행을 다시 집계할 때도 쓴다.
# 사용: evals/meta-codex.sh 결과디렉토리 fixture model rep [skill] [effort]   skill은 dwarf(기본) 또는 none
# meta.sh와 키가 같다. Codex는 비용을 주지 않으므로 cost는 null이고 토큰 수(tokens, total_tokens)를 적는다.
set -uo pipefail

EVALS_DIR=$(cd "$(dirname "$0")" && pwd)
out=$1 fixture=$2 model=$3 rep=$4 skill=${5:-dwarf} effort=${6:-}

# 채점 자료 유출: 실행 기록에 evals 경로가 나오면 그 실행은 무효
leak=$(cat "$out"/phase*.jsonl | grep -c "$EVALS_DIR")

items() { jq -c 'select(.type=="item.completed") | .item' "$out"/phase*.jsonl; }
# 읽은 dwarf 문서: 명령에 나온 스킬 문서 경로. $dwarf 멘션으로 주입된 라우터는 세지 않는다(run.sh의 Skill 호출과 같다).
docs=$(items | jq -r 'select(.type=="command_execution") | .command // ""' \
  | grep -oE '(playbooks|references)/[a-z-]+\.md|[a-z0-9-]+/SKILL\.md' | sort -u | jq -R . | jq -sc .)
tools=$(items | jq -r .type | sort | uniq -c \
  | jq -R 'capture("^ *(?<n>[0-9]+) (?<t>.+)$") | {(.t): (.n | tonumber)}' | jq -sc 'add // {}')

# 단계별 요약. num_turns는 명령·파일 변경·메시지 수, denials는 error·turn.failed 수.
phases=$(for f in "$out"/phase*.jsonl; do
  r="${f%.jsonl}.result.json"
  [ -f "$r" ] || echo '{}' >"$r"
  jq -s --slurpfile r "$r" '
    (map(select(.type=="turn.completed")) | last) as $done
    | {subtype: (if $done then "success" else "error" end), is_error: ($done == null),
       num_turns: (map(select(.type=="item.completed" and (.item.type | IN("command_execution", "file_change", "agent_message")))) | length),
       duration_ms: ($r[0].duration_ms // null), cost_usd: null, tokens: ($done.usage // null),
       denials: (map(select(.type=="error" or .type=="turn.failed")) | length),
       session_id: (map(select(.type=="thread.started")) | first | .thread_id // null)}' "$f"
done | jq -s .)

jq -n --arg fixture "$fixture" --arg model "$model" --arg rep "$rep" --arg skill "$skill" --arg effort "$effort" \
  --argjson leak "$leak" --argjson docs "$docs" --argjson tools "$tools" --argjson phases "$phases" '
  {fixture: $fixture, harness: "codex", model: $model, effort: $effort, rep: ($rep | tonumber? // $rep), skill: $skill,
   leak_mentions: $leak, docs_read: $docs, tool_counts: $tools, phases: $phases, total_cost_usd: null,
   total_tokens: ([$phases[].tokens // {} | (.input_tokens // 0) + (.output_tokens // 0)] | add)}' >"$out/meta.json"

# 판정 자료: 명령마다 입력과 출력 앞부분. 보고서의 근거가 실제 출력인지 판정 모델이 확인하는 데 쓴다.
# 스킬 문서 출력은 생략한다. 긴 출력은 앞 6줄과 뒤 10줄만 남긴다. 추론 항목은 뺀다.
for f in "$out"/phase*.jsonl; do
  jq -rs '
    [.[] | select(.type=="item.completed") | .item | select(.type != "reasoning")]
    | to_entries[]
    | "### \(.key + 1) " + (.value
      | if .type == "command_execution" then
          "command_execution " + ((.command // "") | gsub("\n"; " ⏎ ") | .[0:400]) + " → exit \((.exit_code // "?") | tostring)"
          + (if ((.command // "") | test("skills/")) then "\n(스킬 문서 출력 생략)"
             else "\n" + ((.aggregated_output // "") | split("\n") | if length > 16 then .[0:6] + ["…(\(length - 16)줄 생략)…"] + .[-10:] else . end
                          | join("\n") | if length > 1500 then .[0:700] + " …(생략)… " + .[-700:] else . end) end)
        elif .type == "file_change" then "file_change " + ((.changes // []) | map((.kind // "") + " " + (.path // "")) | join(", "))
        elif .type == "agent_message" then "agent_message (\((.text // "") | split("\n") | length)줄)"
        else "\(.type) " + ((del(.id, .type) | tostring) | .[0:300]) end)
  ' "$f" >"${f%.jsonl}.trace.txt"
done
