#!/usr/bin/env bash
# 실행 디렉토리의 기록으로 meta.json을 만든다. run.sh가 부르고, 기록만 남은 실행을 다시 집계할 때도 쓴다.
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

jq -s --arg fixture "$fixture" --arg model "$model" --argjson rep "$rep" --argjson leak "$leak" \
  --argjson docs "$docs" --argjson tools "$tools" '
  {fixture: $fixture, model: $model, rep: $rep, leak_mentions: $leak, docs_read: $docs, tool_counts: $tools,
   phases: [.[] | {subtype, is_error, num_turns, duration_ms, cost_usd: .total_cost_usd,
                   denials: ((.permission_denials // []) | length), session_id}],
   total_cost_usd: ([.[].total_cost_usd // 0] | add)}' "$out"/phase*.result.json >"$out/meta.json"
