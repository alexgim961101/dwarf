#!/usr/bin/env bash
# 실행 디렉토리의 기록으로 meta.json과 phaseN.trace.txt를 만든다. run.sh가 부르고, 기록만 남은 실행을 다시 집계할 때도 쓴다.
# 사용: evals/meta.sh 결과디렉토리 fixture model rep [skill]   skill은 dwarf(기본), none(스킬 없음 기준선), pstack(비교 실행)
set -uo pipefail

EVALS_DIR=$(cd "$(dirname "$0")" && pwd)
out=$1 fixture=$2 model=$3 rep=$4 skill=${5:-dwarf}

# 채점 자료 유출: 실행 기록에 evals 경로가 나오면 그 실행은 무효
leak=$(cat "$out"/phase*.jsonl | grep -c "$EVALS_DIR")

# playbook 준수: 읽은 dwarf 문서(playbook, references, leaf)와 도구별 호출 수. 상대 경로로 읽은 것도 잡는다.
tool_uses() { jq -c 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use")' "$out"/phase*.jsonl; }
docs=$(tool_uses | jq -r '.input | tostring' \
  | grep -oE '(playbooks|references)/[a-z-]+\.md|[a-z0-9-]+/SKILL\.md' | sort -u | jq -R . | jq -sc .)
tools=$(tool_uses | jq -r .name | sort | uniq -c \
  | jq -R 'capture("^ *(?<n>[0-9]+) (?<t>.+)$") | {(.t): (.n | tonumber)}' | jq -sc 'add // {}')

# 비용: --resume으로 이어 간 단계의 total_cost_usd는 앞 단계까지 더한 누적값이다(Claude Code 2.1.322에서 확인).
# 누적인지는 result의 cache read 합이 앞 단계 값 + 이 단계 메시지들의 cache read 합만큼 되는지로 가리고, 누적이면 앞 단계와의 차이를 단계 비용으로 쓴다.
msg_cr=$(for f in "$out"/phase*.result.json; do
  jq -s '[.[] | select(.type=="assistant") | {id: .message.id, cr: (.message.usage.cache_read_input_tokens // 0)}]
         | unique_by(.id) | map(.cr) | add // 0' "${f%.result.json}.jsonl" 2>/dev/null || echo 0
done | jq -sc .)

jq -s --arg fixture "$fixture" --arg model "$model" --arg rep "$rep" --arg skill "$skill" --argjson leak "$leak" \
  --argjson docs "$docs" --argjson tools "$tools" --argjson msg_cr "$msg_cr" '
  [.[] | {r: ., cum: (.total_cost_usd // 0), cr: ([.modelUsage[]?.cacheReadInputTokens // 0] | add // 0)}] as $p
  | [range(0; $p | length) as $i | $p[$i]
     | .cumulative = ($i > 0 and .r.session_id == $p[$i - 1].r.session_id
                      and .cr >= $p[$i - 1].cr + 0.9 * ($msg_cr[$i] // 0))
     | .cost = (if .cumulative then .cum - $p[$i - 1].cum else .cum end)] as $ph
  | {fixture: $fixture, model: $model, rep: ($rep | tonumber? // $rep), skill: $skill,
     leak_mentions: $leak, docs_read: $docs, tool_counts: $tools,
     phases: [$ph[] | .r as $r | {subtype: $r.subtype, is_error: $r.is_error, num_turns: $r.num_turns, duration_ms: $r.duration_ms,
                     cost_usd: .cost, cost_cumulative: .cumulative,
                     denials: (($r.permission_denials // []) | length), session_id: $r.session_id}],
     total_cost_usd: ([$ph[].cost] | add // 0)}' "$out"/phase*.result.json >"$out/meta.json"

# 판정 자료: 도구 호출마다 입력과 출력 앞부분. 보고서의 근거가 실제 출력인지 판정 모델이 확인하는 데 쓴다.
# 파일 읽기와 스킬 문서 출력은 생략한다. 긴 출력은 앞 6줄과 뒤 10줄만 남긴다.
for f in "$out"/phase*.jsonl; do
  jq -rs '
    (map(select(.type=="user") | .message.content[]? | select(.type=="tool_result")
         | {key: .tool_use_id, value: (.content | if type=="array" then map(.text // "") | join("") else (. // "" | tostring) end)})
     | from_entries) as $res
    | [.[] | select(.type=="assistant") | .message.content[]? | select(.type=="tool_use")]
    | to_entries[]
    | .value as $u | ($res[$u.id] // "") as $r
    | "### \(.key + 1) \($u.name) "
      + (($u.input.command // $u.input.file_path // $u.input.pattern // $u.input.skill // ($u.input | tostring))
         | tostring | gsub("\n"; " ⏎ ") | .[0:400])
      + (if $u.name == "Read" then "\n(읽음 \($r | split("\n") | length)줄)"
         elif ($u.name | test("^(Edit|Write|NotebookEdit|TodoWrite)$")) then ""
         elif (($u.input.command // "") | test("skills/")) then "\n(스킬 문서 출력 생략)"
         else "\n" + ($r | split("\n") | if length > 16 then .[0:6] + ["…(\(length - 16)줄 생략)…"] + .[-10:] else . end
                      | join("\n") | if length > 1500 then .[0:700] + " …(생략)… " + .[-700:] else . end) end)
  ' "$f" >"${f%.jsonl}.trace.txt"
done
