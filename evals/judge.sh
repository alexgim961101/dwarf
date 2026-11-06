#!/usr/bin/env bash
# 같은 fixture의 실행 결과들을 이름을 가린 채 판정 모델 하나가 한 번에 채점한다.
# 사용: evals/judge.sh 결과디렉토리...   환경 변수: JUDGE_MODEL(기본 opus)
set -euo pipefail

EVALS_DIR=$(cd "$(dirname "$0")" && pwd)
[ $# -ge 1 ] || { echo "사용: judge.sh 결과디렉토리..." >&2; exit 1; }
fixture=$(jq -r .fixture "$1/meta.json")
for d in "$@"; do
  [ "$(jq -r .fixture "$d/meta.json")" = "$fixture" ] || { echo "fixture가 다름: $d" >&2; exit 1; }
done
out="$EVALS_DIR/results/judge-$(date +%Y%m%d-%H%M%S)-$fixture"
mkdir -p "$out"
labels=(A B C D E F G H I J K L M N O P Q R S T)

# 실행 순서를 섞어 이름과 모델의 대응을 숨긴다. 대응표는 판정 모델에게 주지 않는다.
runs=()
while IFS= read -r d; do runs+=("$d"); done < <(printf '%s\n' "$@" | awk 'BEGIN{srand()} {print rand() "\t" $0}' | sort -n | cut -f2-)

{
  cat "$EVALS_DIR/judge.md"
  echo
  cat "$EVALS_DIR/fixtures/$fixture/rubric.md"
  echo
  echo "# 요청"
  cat "$EVALS_DIR/fixtures/$fixture/task.md"
  [ -f "$EVALS_DIR/fixtures/$fixture/resume.md" ] && { echo "관문 뒤 이어 간 말:"; cat "$EVALS_DIR/fixtures/$fixture/resume.md"; }
  for i in "${!runs[@]}"; do
    d=${runs[$i]}
    echo
    echo "# 실행 ${labels[$i]}"
    for r in "$d"/phase*.report.md; do
      n=$(basename "$r" .report.md)
      echo "## $n 최종 보고"
      cat "$r"
      echo "## $n 실행 기록 (도구 호출, 앞 150개)"
      head -150 "$d/$n.actions.txt" 2>/dev/null || true
    done
    echo "## 결정적 채점"
    cat "$d/checks.txt"
    echo "## 변경 (시작 커밋 대비 diff, 앞 400줄)"
    head -400 "$d/diff.patch"
  done
} >"$out/prompt.md"

for i in "${!runs[@]}"; do
  jq -n --arg label "${labels[$i]}" --arg dir "${runs[$i]}" --slurpfile m "${runs[$i]}/meta.json" \
    '{label: $label, dir: $dir, model: $m[0].model, rep: $m[0].rep, cost_usd: $m[0].total_cost_usd, leak: $m[0].leak_mentions}'
done | jq -s . >"$out/mapping.json"

(cd "$out" && claude -p --model "${JUDGE_MODEL:-opus}" --tools "" --output-format json <"$out/prompt.md") >"$out/judge.raw.json"
jq -r .result "$out/judge.raw.json" | sed -e '/^```/d' >"$out/judge.json"

# 이름 → 모델 대응을 붙인 요약
jq -r --slurpfile map "$out/mapping.json" '
  ($map[0] | map({(.label): .}) | add) as $m
  | ["실행", "모델", "반복", "점수", "시니어 수준", "비용(USD)", "유출", "가장 큰 부족"],
    (.runs[] | [.label, $m[.label].model, ($m[.label].rep|tostring),
      (([.scores[]] | add | tostring) + "/" + (([.scores[]] | length) * 2 | tostring)),
      (if .senior_level then "예" else "아니오" end),
      ($m[.label].cost_usd * 100 | round / 100 | tostring), ($m[.label].leak|tostring), .main_gap])
  | @tsv' "$out/judge.json" >"$out/summary.tsv"
echo "$out"
column -t -s $'\t' "$out/summary.tsv"
