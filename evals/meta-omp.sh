#!/usr/bin/env bash
# omp 실행 디렉토리의 기록(omp -p --mode json)으로 meta.json과 phaseN.trace.txt를 만든다. run-omp.sh가 부르고, 기록만 남은 실행을 다시 집계할 때도 쓴다.
# 사용: evals/meta-omp.sh 결과디렉토리 fixture model rep [skill] [thinking] [provider]   skill은 dwarf(기본) 또는 none
# meta.sh와 키가 같다. 비용은 omp가 usage에 넣는 추정치의 합이다.
set -uo pipefail

EVALS_DIR=$(cd "$(dirname "$0")" && pwd)
out=$1 fixture=$2 model=$3 rep=$4 skill=${5:-dwarf} thinking=${6:-} provider=${7:-}

# 채점 자료 유출: 실행 기록에 evals 경로가 나오면 그 실행은 무효.
# 자기 결과 디렉토리는 뺀다. omp는 긴 도구 출력을 세션 아티팩트(artifact://N)로 sessions/ 아래에 두고, 다시 읽으면 그 경로가 기록에 남는다.
own=$(cd "$out" && pwd -P)/
leak=$(cat "$out"/phase*.jsonl | grep "$EVALS_DIR" | grep -vcF "$own" || true)

tool_uses() { jq -c 'select(.type=="tool_execution_start")' "$out"/phase*.jsonl; }
# 읽은 dwarf 문서. omp는 스킬을 read skill://<이름> 으로 읽으므로 그것도 <이름>/SKILL.md로 센다.
docs=$(tool_uses | jq -r '.args | tostring' \
  | grep -oE '(playbooks|references)/[a-z-]+\.md|[a-z0-9-]+/SKILL\.md|skill://[a-z0-9-]+' \
  | sed -E 's#^skill://(.*)$#\1/SKILL.md#' | sort -u | jq -R . | jq -sc .)
tools=$(tool_uses | jq -r .toolName | sort | uniq -c \
  | jq -R 'capture("^ *(?<n>[0-9]+) (?<t>.+)$") | {(.t): (.n | tonumber)}' | jq -sc 'add // {}')

# 단계별 요약. num_turns는 assistant 메시지 수, cost_usd는 usage.cost.total의 합, tool_errors는 isError인 도구 결과 수.
phases=$(for f in "$out"/phase*.jsonl; do
  r="${f%.jsonl}.result.json"
  [ -f "$r" ] || echo '{}' >"$r"
  jq -s --slurpfile r "$r" '
    [.[] | select(.type=="message_end" and .message.role=="assistant")] as $a
    | {subtype: (if any(.[]; .type=="agent_end") then "success" else "error" end),
       is_error: (any(.[]; .type=="agent_end") | not),
       num_turns: ($a | length), duration_ms: ($r[0].duration_ms // null),
       cost_usd: ([$a[].message.usage.cost.total // 0] | add),
       tokens: {input: ([$a[].message.usage.input // 0] | add), output: ([$a[].message.usage.output // 0] | add),
                cache_read: ([$a[].message.usage.cacheRead // 0] | add), cache_write: ([$a[].message.usage.cacheWrite // 0] | add)},
       denials: 0, tool_errors: ([.[] | select(.type=="tool_execution_end" and .isError == true)] | length),
       session_id: ([.[] | select(.type=="session")] | first | .id // null)}' "$f"
done | jq -s .)

jq -n --arg fixture "$fixture" --arg model "$model" --arg rep "$rep" --arg skill "$skill" --arg thinking "$thinking" --arg provider "$provider" \
  --argjson leak "$leak" --argjson docs "$docs" --argjson tools "$tools" --argjson phases "$phases" '
  {fixture: $fixture, harness: "omp", provider: $provider, model: $model, effort: $thinking, rep: ($rep | tonumber? // $rep), skill: $skill,
   leak_mentions: $leak, docs_read: $docs, tool_counts: $tools, phases: $phases,
   total_cost_usd: ([$phases[].cost_usd // 0] | add)}' >"$out/meta.json"

# 판정 자료: 도구 호출마다 입력과 출력 앞부분. 보고서의 근거가 실제 출력인지 판정 모델이 확인하는 데 쓴다.
# 파일 읽기와 스킬 문서 출력은 생략한다. 긴 출력은 앞 6줄과 뒤 10줄만 남긴다.
for f in "$out"/phase*.jsonl; do
  jq -rs '
    ([.[] | select(.type=="tool_execution_end")] | map({key: .toolCallId, value: .}) | from_entries) as $ends
    | [.[] | select(.type=="tool_execution_start")]
    | to_entries[]
    | .value as $u | ($ends[$u.toolCallId] // {}) as $e
    | (($e.result.content // []) | map(.text // "") | join("")) as $r
    | "### \(.key + 1) \($u.toolName) "
      + (($u.args.command // $u.args.path // $u.args.pattern // ($u.args | tostring)) | tostring | gsub("\n"; " ⏎ ") | .[0:400])
      + (if $e.isError == true then " (오류)" else "" end)
      + (if $u.toolName == "read" then "\n(읽음 \($r | split("\n") | length)줄)"
         elif ($u.toolName | test("^(edit|write)$")) then ""
         elif (($u.args.command // "") | test("skills/")) then "\n(스킬 문서 출력 생략)"
         else "\n" + ($r | split("\n") | if length > 16 then .[0:6] + ["…(\(length - 16)줄 생략)…"] + .[-10:] else . end
                      | join("\n") | if length > 1500 then .[0:700] + " …(생략)… " + .[-700:] else . end) end)
  ' "$f" >"${f%.jsonl}.trace.txt"
done
