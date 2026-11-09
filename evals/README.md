# evals

같은 playbook을 여러 모델로 돌려 시니어 개발자 수준을 내는지, 어디서 무너지는지 잰다. playbook·leaf를 바꾼 효과도 이것으로 확인한다.

## 구조

```
evals/
  run.sh        fixture 하나를 모델 하나로 실행. 관문이 있으면 --resume으로 이어 가고, 이때 라우터 hook을 --settings로 건다.
                NO_SKILL=1이면 dwarf 없이 같은 요청을 실행한다(스킬 없음 기준선)
  meta.sh       실행 기록으로 meta.json과 phaseN.trace.txt를 만든다. run.sh가 부른다
  run-codex.sh  run.sh의 Codex CLI판. 격리된 CODEX_HOME에 skills/*를 링크하고 $dwarf 멘션으로 부른다. 산출물 모양이 같아 judge.sh에 섞을 수 있다
  meta-codex.sh run-codex.sh 기록의 meta.json·trace. 비용 대신 토큰 수
  run-omp.sh    run.sh의 omp판. --skills로 이 저장소의 스킬만 보이게 하고 /skill:dwarf로 부른다. 세션은 결과 디렉토리 아래, 2단계는 -c
  meta-omp.sh   run-omp.sh 기록의 meta.json·trace. 비용은 omp usage의 추정치 합
  workspace.sh  run.sh·run-codex.sh·run-omp.sh가 쓰는 작업 공간 준비(repo 복사, hidden/history.sh)
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
                  verify.sh + fixes/*.patch: 참조 수정과 흔한 잘못된 수정으로 숨김 테스트의 변별력을 모델 없이 확인
                  repo와 hidden의 파일은 다른 fixture로 가는 심볼릭 링크여도 된다
  results/      실행별 출력. gitignore
```

앞의 셋은 기본 동작 확인용으로 쉽다. 가운데 넷은 과정(재현·같은 결함의 다른 곳·해결안 비교·관문)에서 차이가 나지만 결과는 갈리지 않는다. 2026-11-09 측정에서 haiku가 스킬 없이도 `bugfix-oversell-race`의 숨김 테스트를 다 통과했다. 저장소가 11개 파일이고, 동기 `Map`이라 `await` 한 줄만 옮기면 고쳐지고, 같은 결함의 다른 곳이 `optional`이었기 때문이다. 결과가 갈리는지는 마지막 `bugfix-negative-stock`에서 본다.

| fixture | playbook | 보는 것 |
|---|---|---|
| `bugfix-retry-duplicate` | bug-fix, 관문 1 뒤 이어 감 | 증상과 다른 곳의 원인, 같은 결함의 다른 곳, id 함정, 승인 전 무변경 |
| `feature-status-filter` | feature, 관문 없음 | 필터 뒤 페이지·total, 기존 검증 재사용, 경계·실패 테스트 |
| `ops-502-diagnosis` | incident 멈춤(원인만) | 로그 근거, 미끼 커밋 배제, 설정·컨테이너 무변경 |
| `bugfix-oversell-race` | bug-fix, 관문 1 뒤 이어 감 | 확인과 차감 사이 `await`(동시성), 취소 경로의 이중 환불, 실패 시 되돌림, 과한 직렬화 |
| `ops-stale-dns-502` | incident 멈춤(원인만) | 재배포 뒤 nginx가 옛 api IP를 씀, 미끼 커밋 배제, nginx 상태 무변경 |
| `ops-stale-dns-fix` | incident, 관문 1 뒤 이어 감 | 위와 같은 스택. 승인 전 무변경, 즉시 완화·구조적 해결·재발 방지 비교, 다시 배포해도 502가 안 남 |
| `feature-partial-cancel` | feature, 관문 1 뒤 이어 감 | 스펙·관문, 모호점(할인·배송비) 드러내기, 전체 취소와의 불변식, 하위 기능별 커밋 |
| `bugfix-negative-stock` | bug-fix, 관문 1 뒤 이어 감 | 31개 파일. 비동기 저장소라 `await` 재배치로는 안 고쳐짐, 같은 결함이 다른 모듈(POS)에도 있어 한 곳만 고치면 실패, 예약 주문 상품은 음수가 정상이라 과한 수정도 실패, 먼저 빼고 되돌리는 수정은 일시적 음수·정상 요청 거절로 실패, 미끼 커밋 둘(POS 추가, 리포트 수정). 잘못된 수정 일곱 가지가 각각 다른 숨김 테스트에 걸린다(`hidden/verify.sh`) |

## 실행

```bash
evals/run.sh bugfix-retry-duplicate haiku          # 한 번
for f in bugfix-oversell-race ops-stale-dns-502 feature-partial-cancel; do
  for m in haiku sonnet opus; do for r in 1 2; do evals/run.sh "$f" "$m" "$r"; done; done
done
NO_SKILL=1 evals/run.sh bugfix-retry-duplicate haiku     # 스킬 없음 기준선. 결과 디렉토리 이름 끝에 -noskill
evals/judge.sh evals/results/*-bugfix-retry-duplicate-*   # fixture마다 판정. dwarf 실행과 기준선을 섞어도 된다
CODEX_SANDBOX=danger-full-access evals/run-codex.sh bugfix-negative-stock gpt-6-luna   # Codex CLI. bwrap 샌드박스가 안 되는 머신은 danger-full-access
NO_SKILL=1 CODEX_SANDBOX=danger-full-access evals/run-codex.sh bugfix-negative-stock gpt-6-luna
evals/run-omp.sh bugfix-negative-stock gpt-6-luna          # omp. provider는 OMP_PROVIDER(기본 openai-codex), thinking은 OMP_THINKING(기본 medium)
NO_SKILL=1 evals/run-omp.sh bugfix-negative-stock gpt-6-luna
```

- 실행마다 사용량이 든다. 단계당 상한은 `BUDGET_USD`(기본 5). 여러 번 돌리기 전에 비용을 확인한다.
- Codex·omp 실행(`run-codex.sh`, `run-omp.sh`)은 `meta.json`에 `harness`와 `effort`(codex effort, omp thinking)를 적는다. Codex는 비용 대신 토큰 수, omp는 usage의 비용 추정치 합. 둘 다 관문 hook이 없어 승인 전 무변경은 규칙만으로 지켜진 결과다. Codex의 임시 `CODEX_HOME`은 결과 디렉토리 아래 `codex-home/`에 생겼다가 끝나면 지워지고, omp 세션은 `sessions/`에 남는다.
- 결과 디렉토리: `phaseN.report.md`(최종 보고), `phaseN.actions.txt`(도구 호출 순서), `phaseN.trace.txt`(도구 호출과 출력 앞뒤. 판정 자료), `phaseN.state.md`(단계가 끝날 때의 상태 파일), `checks.txt`(결정적 채점), `diff.patch`, `meta.json`(비용·턴·거부 수·유출·skill). `meta.sh 결과디렉토리 fixture model rep [skill]`로 다시 만든다.
- 판정 디렉토리: `summary.tsv`(실행·모델·스킬·점수), `judge.json`, `mapping.json`, `prompt.md`.
- 판정 결과는 사람이 `phaseN.report.md`와 `diff.patch`를 직접 읽어 대조한다. 판정 모델과 다르면 기준이 모호하거나 판정이 치우친 것이다.

## 스킬 없음 기준선

dwarf가 비용(토큰·턴)만큼 결과를 좋게 하는지는 dwarf 없이 돌린 같은 요청과 비교해야 보인다. `NO_SKILL=1`이 그 기준선이다.

- 요청은 `task.md`에서 앞의 `/dwarf `만 뗀 것. `resume.md`가 있으면 2단계도 같은 말로 이어 간다. 시스템 프롬프트(무인 실행), 모델, 권한 모드, 예산은 같다.
- `skills/*/` 아래 모든 스킬을 `skillOverrides`로 끈다. 스킬을 부르지 않으므로 관문 hook은 걸리지 않고 상태 파일도 없다.
- `meta.json`의 `skill`이 `none`이고 `docs_read`가 비어 있어야 기준선이다. dwarf 문서를 읽었으면 `run.sh`가 경고를 내고, 그 실행은 버린다.
- 결정적 채점은 그대로 돈다. 관문 관련 항목(`gate-no-edit`, `gate-record`)은 기준선에서 FAIL·INFO로 나오는 것이 정상이고, 그 자체가 비교 자료다.
- 판정은 dwarf 실행과 기준선을 같은 `judge.sh`에 섞어 넣는다. 판정 모델에게는 `/dwarf`를 뗀 요청을 보이고, 실행 기록에 보이는 스킬 사용으로 가점·감점하지 않게 지시한다(`judge.md`). 대응은 `summary.tsv`의 스킬 열로 본다.
- 보는 것: 판정 점수와 시니어 수준 비율, 숨김 테스트 PASS 수, 비용·턴 수. 점수 차이가 비용 차이를 정당화하지 못하면 스킬을 줄일 곳을 찾는다.

## 블라인드 규칙

- 요청은 사용자가 칠 법한 말로 쓴다. 평가·테스트·채점·비교 같은 메타 단어를 쓰지 않는다.
- 작업 공간은 임시 디렉토리 아래 프로젝트 이름이다. `hidden/`과 `rubric.md`는 복사하지 않는다.
- 실행 기록에 `evals/` 경로가 나오면 유출이다(`meta.json`의 `leak_mentions`). 그 실행은 버린다.
- 판정 모델은 A·B·C 이름만 본다. 모델 대응은 판정 뒤에 붙인다.
- 판정 근거는 보고서 주장이 아니라 결정적 채점·실행 기록·diff로 확인한 사실이다.

## 실행 조건

- 요청에 "서브에이전트 없이"를 넣어 실행 모델 하나의 품질만 잰다. 매핑된 reviewer 모델이 섞이지 않게 하려는 것이다.
- 권한 모드는 `auto`. 도구 거부 수는 `meta.json`의 `denials`.
- 모든 단계에 `--append-system-prompt`로 무인 실행임을 알린다(`skills/dwarf/references/headless.md`). 상태 파일은 `references/state.md`.
- 필요한 것: Claude Code, Node.js 22 이상, `jq`, Docker(ops fixture). Codex 실행은 Codex CLI와 로그인(`~/.codex/auth.json`), omp 실행은 omp와 provider 로그인, `./install.sh --tool omp`. Linux·macOS. macOS에서는 `gtimeout`(coreutils)이 있을 때만 단계 시간 제한이 걸린다.
- 실행이 끝나면 작업 공간, 컨테이너, `~/.claude/projects/`의 그 실행 기록을 지운다. `KEEP_WS=1`이면 작업 공간을 남긴다.

## fixture 추가

- 숨김 테스트는 먼저 세 가지를 확인한다. 결함 원본에서 실패, 참조 수정에서 통과, 흔한 잘못된 수정에서 실패. 참조 수정을 `hidden/fixes/reference.patch`, 잘못된 수정을 `hidden/fixes/wrong-*.patch`로 두고 `hidden/verify.sh`로 확인한다(`bugfix-negative-stock` 참고). 모델 없이 돈다.
- `check.sh 작업공간 단계 상태디렉토리`는 단계(`phase1`, `phase2`)마다 `PASS`·`FAIL`·`INFO` 줄을 낸다. 함수는 `lib.sh`.
- `rubric.md`는 기대 답과 기준별 0·1·2점 설명을 둔다.

### 결과가 갈리게 만드는 법

스킬 유무로 과정만 다르고 숨김 테스트가 똑같이 통과하면 fixture가 쉬운 것이다. 아래 중 셋 이상을 갖춘다.

- 그럴듯한 첫 수정이 숨김 테스트에 걸린다. 증상을 보고 바로 떠오르는 수정(줄 옮기기, 조건 하나 추가)이 보이는 테스트는 통과하지만 숨김 테스트는 통과하지 못하게 한다. 예: 저장소가 비동기라 호출부 재배치로는 경쟁이 남는다.
- 같은 결함이 다른 모듈에 있고 필수다. 요청한 증상을 그 경로도 만들 수 있으면 숨김 테스트에 넣는다. `optional-`은 요청 밖의 결함에만 쓴다.
- 경계에서 고쳐야 한다. 호출부마다 따로 고친 것(각자 lock)은 호출부 둘을 섞은 테스트가 잡는다.
- 정상인 예외가 있다. 증상과 같은 모양이지만 정상인 경우(예약 주문 상품의 음수 재고)를 두어 과한 수정(전부 금지, clamp)이 걸리게 한다.
- 증상 숨김이 걸린다. 표시·데이터만 고치는 수정이 실패하는 테스트를 둔다.
- 최종값만 보지 않는다. 중간 상태(잠깐 저장된 음수)와 섞인 요청(실패할 큰 요청과 성공해야 할 작은 요청)을 본다. 최종값만 맞추는 수정(먼저 빼고 되돌림)이 걸린다. 기준선 실행의 diff를 `hidden/fixes/wrong-*.patch`로 가져와 다음 fixture의 함정으로 쓴다.
- 미끼 커밋. 최근 커밋이 증상 근처를 건드리지만 원인은 더 오래된 커밋이다. 원인 커밋은 diff가 커서 그 안에서 줄을 찾아야 한다.
- 다 읽기에는 크다. 20개 파일 이상. `cat` 두어 번으로 전부 읽히면 조사 전략이 필요 없다.
- 비용이 늘어나므로 `run.sh` 한 번의 비용을 먼저 확인한다.
