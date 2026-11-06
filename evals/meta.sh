#!/usr/bin/env bash
# 실행 디렉토리의 기록으로 meta.json과 phaseN.trace.txt를 만든다. run.sh가 부르고, 기록만 남은 실행을 다시 집계할 때도 쓴다.
# 사용: evals/meta.sh 결과디렉토리 fixture model rep
set -uo pipefail

EVALS_DIR=$(cd "$(dirname "$0")" && pwd)
out=$1 fixture=$2 model=$3 rep=$4

# 채점 자료 유출: 실행 기록에 evals 경로가 나오면 그 실행은 무효
leak=$(cat "$out"/phase*.jsonl | grep -c "$EVALS_DIR")

# playbook 준수: 읽은 dwarf 문서(playbook, references, leaf)와 도구별 호출 수. 상대 경로로 읽은 것도 잡는다.
tool_uses() { jq -c 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use")' "$out"/phase*.jsonl; }
docs=$(tool_uses | jq -r '.input | tostring' \
  | grep -oE '(playbooks|references)/[a-z-]+\.md|[a-z0-9-]+/SKILL\.md' | sort -u | jq -R . | jq -sc .)
tools=$(tool_uses | jq -r .name | sort | uniq -c \
  | jq -R 'capture("^ *(?<n>[0-9]+) (?<t>.+)$") | {(.t): (.n | tonumber)}' | jq -sc 'add // {}')

jq -s --arg fixture "$fixture" --arg model "$model" --arg rep "$rep" --argjson leak "$leak" \
  --argjson docs "$docs" --argjson tools "$tools" '
  {fixture: $fixture, model: $model, rep: ($rep | tonumber? // $rep), leak_mentions: $leak, docs_read: $docs, tool_counts: $tools,
   phases: [.[] | {subtype, is_error, num_turns, duration_ms, cost_usd: .total_cost_usd,
                   denials: ((.permission_denials // []) | length), session_id}],
   total_cost_usd: ([.[].total_cost_usd // 0] | add)}' "$out"/phase*.result.json >"$out/meta.json"

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
