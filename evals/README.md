# evals

같은 playbook을 여러 모델로 돌려 시니어 개발자 수준을 내는지, 어디서 무너지는지 잰다. playbook·leaf를 바꾼 효과도 이것으로 확인한다.

## 구조

```
evals/
  run.sh        fixture 하나를 모델 하나로 실행. 관문이 있으면 --resume으로 이어 가고, 이때 라우터 hook을 --settings로 건다.
                NO_SKILL=1이면 dwarf 없이 같은 요청을 실행한다(스킬 없음 기준선)
                PSTACK_DIR=<경로>이면 dwarf 대신 pstack의 Claude Code 플러그인으로 같은 요청을 실행한다(pstack 비교 실행)
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
                  숨김 테스트가 바꾸기 전 저장소와 비교해야 하면 ORIGINAL_REPO(repo/ 경로)를 쓴다. verify.sh가 넘기고 check.sh도 넘겨야 한다
                  repo와 hidden의 파일은 다른 fixture로 가는 심볼릭 링크여도 된다
  results/      실행별 출력. gitignore
```

앞의 셋은 기본 동작 확인용으로 쉽다. 가운데 넷은 과정(재현·같은 결함의 다른 곳·해결안 비교·관문)에서 차이가 나지만 결과는 갈리지 않는다. 2026-11-09 측정에서 haiku가 스킬 없이도 `bugfix-oversell-race`의 숨김 테스트를 다 통과했다. 저장소가 11개 파일이고, 동기 `Map`이라 `await` 한 줄만 옮기면 고쳐지고, 같은 결함의 다른 곳이 `optional`이었기 때문이다. 결과가 갈리는지는 `bugfix-negative-stock`에서 본다. 마지막 `refactor-totals-dedupe`는 dwarf와 pstack을 비교하려고 만들었고, dwarf 문서를 이 fixture에 맞춰 고치지 않은 상태에서 처음 잰다.

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
| `refactor-totals-dedupe` | refactoring, 한 번에 끝냄 | 38개 파일. 복붙된 금액 계산 세 벌이 여섯 군데에서 다르다(무료배송 판정 금액, 수량 검증, 세액 반올림 단위, 음수 반올림, 배송비 조건, 결과 키 순서). 숨김 테스트는 바꾸기 전 저장소와 작업 공간을 같은 입력으로 비교한다. diff 밖에서 깨지는 곳 셋(`config/jobs.json`의 문자열 경로, 키 순서로 열을 만드는 원장 CSV, API 상태 코드)은 `npm test`가 잡지 못한다. 복붙이 남으면 구조 검사에 걸린다. 차이의 이유는 커밋 메시지에 있다. 잘못된 수정 일곱 가지가 모두 보이는 테스트는 통과하고 숨김 테스트에 걸린다 |

## 실행

```bash
evals/run.sh bugfix-retry-duplicate haiku          # 한 번
for f in bugfix-oversell-race ops-stale-dns-502 feature-partial-cancel; do
  for m in haiku sonnet opus; do for r in 1 2; do evals/run.sh "$f" "$m" "$r"; done; done
done
NO_SKILL=1 evals/run.sh bugfix-retry-duplicate haiku     # 스킬 없음 기준선. 결과 디렉토리 이름 끝에 -noskill
PSTACK_DIR=~/src/cursor-plugins/harness/pstack/claude-code evals/run.sh refactor-totals-dedupe haiku   # pstack 비교 실행. 끝에 -pstack
evals/judge.sh evals/results/*-bugfix-retry-duplicate-*   # fixture마다 판정. dwarf 실행, 기준선, pstack 실행을 섞어도 된다
CODEX_SANDBOX=danger-full-access evals/run-codex.sh bugfix-negative-stock gpt-6-luna   # Codex CLI. bwrap 샌드박스가 안 되는 머신은 danger-full-access
NO_SKILL=1 CODEX_SANDBOX=danger-full-access evals/run-codex.sh bugfix-negative-stock gpt-6-luna
evals/run-omp.sh bugfix-negative-stock gpt-6-luna          # omp. provider는 OMP_PROVIDER(기본 openai-codex), thinking은 OMP_THINKING(기본 medium)
NO_SKILL=1 evals/run-omp.sh bugfix-negative-stock gpt-6-luna
```

- 실행마다 사용량이 든다. 단계당 상한은 `BUDGET_USD`(기본 5). 여러 번 돌리기 전에 비용을 확인한다.
- `meta.json`의 비용. `--resume`으로 이어 간 단계의 `total_cost_usd`는 앞 단계까지 더한 누적값이라, `meta.sh`가 앞 단계와의 차이를 그 단계의 `cost_usd`로 적고(`cost_cumulative: true`) `total_cost_usd`는 그 합이다. 2026-11-11 전에는 누적값을 그대로 더해 2단계 실행의 비용이 1단계만큼 부풀었다. 그 전 결과 디렉토리의 `meta.json`은 다시 집계했고, 판정 디렉토리의 `judge.md` 표와 `docs/progress.md`의 11절까지 비용은 옛 값이다.
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

## pstack 비교 실행

dwarf가 참고한 pstack(`cursor/plugins`의 `pstack/`, MIT)과 같은 요청으로 비교한다. `PSTACK_DIR`이 그 실행이다.

- pstack은 이 저장소에 넣지 않는다. 저장소 밖에 받아 커밋을 고정하고, Claude Code 포트 경로를 `PSTACK_DIR`로 준다. `evals/` 아래에 두면 플러그인 경로가 실행 기록에 남아 모든 실행이 유출로 잡히므로 `run.sh`가 거부한다.

```bash
git clone --filter=blob:none --sparse https://github.com/cursor/plugins ~/src/cursor-plugins
git -C ~/src/cursor-plugins sparse-checkout set pstack harness .claude-plugin
git -C ~/src/cursor-plugins checkout <고정할 커밋>     # 측정한 커밋과 plugin.json의 version을 docs/progress.md에 적는다
```

- 요청은 `task.md`의 `/dwarf `를 `/pstack:poteto-mode `로 바꾼 것. 이어 가는 말(`resume.md`), 시스템 프롬프트, 모델, 권한 모드, 예산은 같다.
- `skills/*/`를 `skillOverrides`로 모두 끄고 `--plugin-dir`로 pstack을 싣는다. pstack에는 hook이 없다. `meta.json`의 `skill`은 `pstack`, `docs_read`에는 pstack 문서가 들어간다. dwarf 라우터를 읽은 실행은 `run.sh`가 경고하고, 그 실행은 버린다.
- 잴 수 있는 것은 pstack의 Claude Code 포트다. Cursor 전용 스킬(`deslop`, `control-cli`, `control-ui`)과 Bugbot·Automations가 없고, Grok·GPT 역할은 세션 모델로 떨어진다. 결과를 "pstack"이 아니라 "pstack의 Claude Code 포트"로 적는다.
- 같은 잣대로 볼 것과 따로 볼 것.
  - 같은 잣대: 숨김 테스트, 비용·턴 수, 어느 쪽 playbook에도 있는 과정 기준(재현, 원인, 동작 고정, diff 밖 영향, 검증 근거).
  - 따로: 관문 준수와 해결안 비교는 dwarf playbook에서 나온 기준이다. pstack은 승인을 기다리지 않고 바로 고치므로 이 기준의 점수는 표에서 나눠 적는다. 관문이 있는 fixture(`resume.md`)에서는 pstack이 1단계에서 다 끝내 2단계의 "진행"이 할 일이 없을 수 있다.
  - 요청 없는 커밋과 PR 시도는 pstack의 기본 동작(모든 playbook이 PR 열기로 끝난다)이다. 작업 공간에 remote가 없어 PR은 열리지 않는다. `INFO commits`로만 남긴다.
- 요청에 "서브에이전트 없이"가 있으면 pstack의 위임(구현 위임, 여러 모델 패널)은 쓰이지 않는다. 한 모델이 문서만 보고 내는 품질의 비교다. 위임을 허용한 비교는 역할 모델을 한 모델로 고정한 뒤 따로 잰다.
- 기존 fixture는 dwarf를 고치면서 함께 조정했다(`bugfix-negative-stock`의 결과로 `root-cause`를 고쳤다). 비교용 fixture는 dwarf를 그 fixture에 맞춰 고치기 전에 먼저 잰다.

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
- eval은 호스트에서 돈다. 저장소의 dev 서버 기본 포트는 3000·8080 같은 흔한 값을 쓰지 않는다(지금 4731~4733). 2026-11-11 파일럿에서 기본 포트 3000이 사용자 컨테이너와 겹쳤고, 한 실행이 그 포트의 프로세스를 kill하려다 auto mode에 막혔다. 컨테이너가 필요하면 호스트 포트는 `127.0.0.1::80`처럼 무작위로 둔다.
- 동작을 바꾸지 않는 요청(refactoring)은 원본이 동작 테스트를 모두 통과한다. 아무것도 하지 않은 실행이 통과하지 않게 구조 검사를 숨김 테스트에 넣고, 동작은 바꾸기 전 저장소(`ORIGINAL_REPO`)와 비교한다(`refactor-totals-dedupe` 참고). 숨김 테스트는 밖에서 쓰는 표면(조립 함수, HTTP, 스크립트 출력)만 써서 내부 구조를 어떻게 바꿔도 돌게 한다.

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
