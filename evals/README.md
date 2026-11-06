# evals

같은 playbook을 여러 모델로 돌려 시니어 개발자 수준을 내는지, 어디서 무너지는지 잰다. playbook·leaf를 바꾼 효과도 이것으로 확인한다.

## 구조

```
evals/
  run.sh        fixture 하나를 모델 하나로 실행. 관문이 있으면 --resume으로 이어 감
  judge.sh      같은 fixture의 실행들을 이름을 가린 채 판정 모델 하나가 채점
  judge.md      판정 지시
  lib.sh        check.sh가 쓰는 결정적 채점 함수
  fixtures/<이름>/
    project       작업 공간 디렉토리 이름(예: notifier)
    repo/         시작 저장소
    task.md       사용자 요청
    resume.md     (선택) 관문 1 뒤 이어 가는 말
    rubric.md     판정 기준과 기대 답. 실행하는 쪽에는 보이지 않음
    hidden/       check.sh(필수), grade.test.js, history.sh, pre.sh, post.sh
  results/      실행별 출력. gitignore
```

앞의 셋은 기본 동작 확인용으로 쉽다. 모델 간 차이는 뒤의 셋에서 본다.

| fixture | playbook | 보는 것 |
|---|---|---|
| `bugfix-retry-duplicate` | bug-fix, 관문 1 뒤 이어 감 | 증상과 다른 곳의 원인, 같은 결함의 다른 곳, id 함정, 승인 전 무변경 |
| `feature-status-filter` | feature, 관문 없음 | 필터 뒤 페이지·total, 기존 검증 재사용, 경계·실패 테스트 |
| `ops-502-diagnosis` | bug-fix 멈춤(원인만) | 로그 근거, 미끼 커밋 배제, 설정·컨테이너 무변경 |
| `bugfix-oversell-race` | bug-fix, 관문 1 뒤 이어 감 | 확인과 차감 사이 `await`(동시성), 취소 경로의 이중 환불, 실패 시 되돌림, 과한 직렬화 |
| `ops-stale-dns-502` | bug-fix 멈춤(원인만) | 재배포 뒤 nginx가 옛 api IP를 씀, 미끼 커밋 배제, nginx 상태 무변경 |
| `feature-partial-cancel` | feature, 관문 1 뒤 이어 감 | 스펙·관문, 모호점(할인·배송비) 드러내기, 전체 취소와의 불변식, 하위 기능별 커밋 |

## 실행

```bash
evals/run.sh bugfix-retry-duplicate haiku          # 한 번
for f in bugfix-oversell-race ops-stale-dns-502 feature-partial-cancel; do
  for m in haiku sonnet opus; do for r in 1 2; do evals/run.sh "$f" "$m" "$r"; done; done
done
evals/judge.sh evals/results/*-bugfix-retry-duplicate-*   # fixture마다 판정
```

- 실행마다 사용량이 든다. 단계당 상한은 `BUDGET_USD`(기본 5). 여러 번 돌리기 전에 비용을 확인한다.
- 결과 디렉토리: `phaseN.report.md`(최종 보고), `phaseN.actions.txt`(도구 호출 순서), `checks.txt`(결정적 채점), `diff.patch`, `meta.json`(비용·턴·거부 수·유출).
- 판정 디렉토리: `summary.tsv`(실행·모델·점수), `judge.json`, `mapping.json`, `prompt.md`.
- 판정 결과는 사람이 `phaseN.report.md`와 `diff.patch`를 직접 읽어 대조한다. 판정 모델과 다르면 기준이 모호하거나 판정이 치우친 것이다.

## 블라인드 규칙

- 요청은 사용자가 칠 법한 말로 쓴다. 평가·테스트·채점·비교 같은 메타 단어를 쓰지 않는다.
- 작업 공간은 임시 디렉토리 아래 프로젝트 이름이다. `hidden/`과 `rubric.md`는 복사하지 않는다.
- 실행 기록에 `evals/` 경로가 나오면 유출이다(`meta.json`의 `leak_mentions`). 그 실행은 버린다.
- 판정 모델은 A·B·C 이름만 본다. 모델 대응은 판정 뒤에 붙인다.
- 판정 근거는 보고서 주장이 아니라 결정적 채점·실행 기록·diff로 확인한 사실이다.

## 실행 조건

- 요청에 "서브에이전트 없이"를 넣어 실행 모델 하나의 품질만 잰다. 매핑된 reviewer 모델이 섞이지 않게 하려는 것이다.
- 권한 모드는 `auto`. 도구 거부 수는 `meta.json`의 `denials`.
- 필요한 것: Claude Code, Node.js 22 이상, `jq`, Docker(ops fixture). Linux·macOS. macOS에서는 `gtimeout`(coreutils)이 있을 때만 단계 시간 제한이 걸린다.
- 실행이 끝나면 작업 공간, 컨테이너, `~/.claude/projects/`의 그 실행 기록을 지운다. `KEEP_WS=1`이면 작업 공간을 남긴다.

## fixture 추가

- 숨김 테스트는 먼저 세 가지를 확인한다. 결함 원본에서 실패, 참조 수정에서 통과, 흔한 잘못된 수정에서 실패.
- `check.sh 작업공간 단계 상태디렉토리`는 단계(`phase1`, `phase2`)마다 `PASS`·`FAIL`·`INFO` 줄을 낸다. 함수는 `lib.sh`.
- `rubric.md`는 기대 답과 기준별 0·1·2점 설명을 둔다.
