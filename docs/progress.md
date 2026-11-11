# 개선 진행 기록

dwarf를 어디까지 개선했는지와 다음에 이어 갈 곳. 측정 방법은 `evals/README.md`.

## 목표와 방식

- 목표: 모든 playbook·leaf가 대부분의 모델에서 시니어 개발자 수준의 결과를 낸다.
- 최종 형태: 사용자에게 배정된 Jira·GitHub 이슈를 감시하고, 이슈마다 담당 Agent가 dwarf와 서브에이전트로 처리한다. 중간에 Slack·Discord로 의견을 묻고, 사용자가 최종 리뷰할 PR을 연다. 느려도 된다. 담당 Agent(감시·실행·메신저)는 dwarf 스킬 밖에 둔다.
- 개선마다 `evals/`로 전후를 잰다. 결정적 채점(`check.sh`)과 블라인드 판정(`judge.sh`)을 함께 본다.
- 외부 교차 검증은 GPT 계열 모델(codex·omp)로만 하고 effort를 명시한다. 예: `codex exec -m gpt-6.1-sol -c model_reasoning_effort=high`.

## 항목 상태 (2026-11-11)

| # | 항목 | 상태 |
|---|---|---|
| - | eval 하네스, 관문 hook, bug-fix·root-cause 보강 | 완료 (`9653ab7`) |
| - | 판정 자료에 도구 출력 앞뒤 포함(`phaseN.trace.txt`) | 완료 |
| 3 | `incident` playbook (실행 중인 시스템의 장애) | 완료. 남은 문제 아래 |
| 4 | 단계 생략 방지 (playbook 미열람, inspect 생략) | 완료. 측정 결과와 남은 문제 아래 |
| 5 | headless 실행 상태 (todo 대신 상태 파일, `--resume` hook) | 완료. 측정 결과 아래 |
| 6 | 파이프라인 (Jira·GitHub intake, Discord 질의, GitHub·Bitbucket PR) | 담당 Agent 구현·통합 확인까지. 실제 서비스 연결 전 |
| 7 | 스킬 없음 기준선 (`NO_SKILL=1`) | 완료. `bugfix-oversell-race` haiku 첫 측정 결과 아래 |
| 8 | 상태 파일 단일화 (todo 제거, 다른 세션에서 이어 가기) | 완료. 무인 실행 회귀 확인. 새 세션 이어 가기는 미측정 |
| 9 | 결과가 갈리는 fixture (`bugfix-negative-stock`) | 완료. haiku·sonnet 모두 숨김 테스트가 갈렸다(dwarf 14/14, 기준선 12/14). 결과 아래 |
| 10 | `root-cause` leaf 보강 (같은 결함의 다른 곳을 모양으로 찾기) | 구현. 측정 불가: haiku가 leaf를 읽지 않음(8회 중 6회). leaf 생략 방지가 먼저 |
| 11 | Codex·omp 실행기 (`evals/run-codex.sh`, `evals/run-omp.sh`, luna·terra·sol) | 완료. omp 6회 측정. GPT는 기준선도 숨김 14/14라 과정 기준에서만 갈린다(dwarf +1~+6). 결과 아래 |
| 12 | pstack 비교 (`PSTACK_DIR` 실행, `refactor-totals-dedupe`) | 실행기와 fixture 완료. `bugfix-negative-stock` 숨김은 pstack·dwarf 모두 14/14. 판정 haiku dwarf 13·13 vs pstack 10·10, sonnet 13·13 vs 9·11. 관문·해결안 비교를 빼면 차이 0~2. 비용은 pstack이 haiku 1/2~1/10, sonnet 약 60%. refactor 파일럿은 결과가 갈리지 않음. 결과 아래 |
| 13 | 비용 최적화 | 비용 집계 오류 수정(2단계 실행이 부풀었음). bug-fix 2단계 patch 적용·mktemp·관문 Read로 sonnet 2단계 -14%, haiku의 헤매는 꼬리 제거. haiku 판정은 13·13 → 11·11(바꾼 단계 밖의 실패, 2회라 미확정). 결과 아래 |
| 14 | root-cause 강제 hook (bug-fix 관문 `pending` 전에 leaf 열람) | 구현. haiku 열람 0/4 → 4/4, 원인 커밋 2/4 → 3/4, `cancel` 3/4 → 3/4로 구분되는 효과 없음. Bash로 쓴 관문 기록을 알리는 빈틈 수정. 유지(2026-11-11 결정) |
| 15 | GPT 3종 재측정 (omp, 각 2회) | sol dwarf 13·14(시니어 예, 원인 커밋·`cancel` 2/2) vs 기준선 8. terra 8·8 vs 7(관문 무시, 시험 생략). luna 10·8 vs 5. 숨김은 기준선도 14/14. omp 유출 오탐 수정. 결과 아래 |

## 3. incident

### 바꾼 것

- `playbooks/incident.md` 추가.
  - 진단은 읽기만 한다. 관문 1 전에는 실행 중인 대상의 상태를 바꾸지 않고, 그런 일을 하는 스크립트도 실행하지 않는다.
  - 해결은 즉시 완화·구조적 해결·재발 방지 세 갈래를 비교해 승인받는다. 시험은 자원을 공유하지 않는 복제본에서 한다.
  - 저장소 변경은 실행 중인 대상에 닿는 명령까지 계획한다. 단일 파일 bind mount 같은 경우를 포함한다.
- 라우터 분류 트리에 incident를 넣었다. 관문 hook에서 incident는 `none`을 쓸 수 없다. `gate.md`, `AGENTS.md`, `README.md`, `tests/`를 함께 갱신했다.
- 새 fixture `ops-stale-dns-fix`: 승인 전 무변경, 수정이 저장소에 남는지, 재배포해도 502가 안 나는지를 본다. `ops-stale-dns-502`와 같은 저장소를 쓴다.

### 결과

결정적 채점, `ops-stale-dns-fix`.

| 지표 | 기준선 (bug-fix로 처리) | incident |
|---|---|---|
| 승인 전 실행 중인 스택 변경 | 2/6 (haiku, sonnet) | 1/6 (haiku. playbook을 읽지 않은 실행) |
| 그중 playbook을 읽은 실행 | 2/6 | 0/5 |
| 재배포 뒤 유지 | 6/6 | 5/6 |

블라인드 판정 (opus 판정, 기준선과 incident 실행을 섞어 채점).

| fixture | 기준선 | incident |
|---|---|---|
| `ops-stale-dns-fix` (14점 × 6) | 64/84 (76%), 시니어 수준 3/6 | 77/84 (92%), 4/6 |
| `ops-stale-dns-502` (12점 × 6) | 59/72 (82%), 3/6 | 72/72 (100%), 6/6 |

- 회귀 확인: `ops-502-diagnosis`의 haiku·sonnet 실행은 결정적 채점 PASS였다. incident로 분류됐다.
- 라우팅: `tests/routing.md` 47개(트리 밖 2개 포함)에서 haiku와 sonnet 모두 불일치 0이었다.
- 비용은 모델별로 기준선과 비슷했다(±10% 안팎).

5단계 보강(실행 중인 대상에 닿는 경로) 뒤 재확인, `ops-stale-dns-fix`.

| 실행 | 결과 |
|---|---|
| sonnet ×2 | 전부 PASS |
| haiku ×2 | 2회 모두 재배포 뒤 유지 FAIL. 단일 파일 bind mount 함정을 계획에서 놓쳤다. 적용 중에 발견하고 멈춘 뒤 web 재생성 승인을 다시 요청했다 |

- 보강 전 haiku 2회는 `deploy.sh`에 nginx reload를 넣는 안을 골라 통과했다. 보강 뒤 2회는 nginx resolver 안을 골라 함정에 걸렸다. 표본이 작아 보강 문구의 효과는 판단하지 못했다.

### 남은 문제

- **haiku가 playbook을 읽지 않고 작업하는 경우**가 2/20 있었다. 승인 전 reload가 여기서 나왔다. #4에서 다룬다.
- **단일 파일 bind mount 함정**: 설정 파일 하나만 bind mount 했을 때 파일을 새로 쓰면 컨테이너는 옛 내용을 계속 본다. 이 경우를 계획 단계에서 놓치는 실행이 있었다(보강 전 sonnet 1회, 보강 뒤 haiku 2회). 모두 적용 중에 편차를 발견하고 멈춘 뒤 web 재생성 승인을 다시 요청했다. 규칙대로 한 동작이다. 관문 전 `inspect` 점검(#4)으로 잡히는지 볼 것.
- **판정 천장**: incident 실행 대부분이 만점이다. 차이를 보려면 더 어려운 fixture가 필요하다. 예: 원인이 둘 겹친 장애, 적용 중 예상과 다른 상태.

## 4. 단계 생략 방지

### 기준선 (기존 eval 실행 50회, 리뷰 전에 멈추는 요청 포함이라 대략값)

| 지표 | haiku | sonnet | opus |
|---|---|---|---|
| playbook을 읽지 않음 | 2/20 | 0/17 | 0/13 |
| `inspect`를 읽음 | 2/20 | 4/17 | 6/13 |

### 바꾼 것 (관문 hook `gate.py` 확장)

- PreToolUse matcher에 `Read`를 더한다. Read 경로와 Bash 명령에 나온 dwarf 문서(`playbooks/*.md`, `references/agents.md`, `inspect/SKILL.md`)를 세션 상태에 기록한다.
- playbook을 열기 전에는 막는다.
  - Bash는 dwarf 문서·설정을 읽는 명령만 허용한다.
  - Edit·Write와 관문 기록도 막는다.
  - 맞는 playbook이 없으면 관문에 `status: none`, `playbook: 없음`, `reason`을 쓰게 한다. Agent 매핑 파일 쓰기는 playbook 없이 허용한다. 처음에는 `references/agents.md`를 읽으면 통과로 했으나, 매핑이 없는 첫 실행에서 playbook 검사를 건너뛰는 구멍이라 바꿨다.
- Stop hook을 추가해 inspect를 거치지 않고 끝내려 하면 한 번 되돌려 보낸다(`stop_hook_active`면 허용).
  - 관문 보고 전(`pending`): feature, incident.
  - 작업 트리를 바꾸거나 커밋한 뒤(`approved`·`none`): bug-fix, incident, feature, refactoring, perf. feature는 처음 설계에 없었으나 7단계에 inspect가 있어 넣었다. 커밋하면 diff가 비므로 세션 시작 HEAD와도 비교한다.
- 주의: Stop은 최종 보고를 쓴 뒤에 걸린다. `claude -p`의 결과는 마지막 메시지이므로, 되돌려 보낼 때 점검 결과를 넣어 보고 전체를 다시 쓰게 한다. 출력 비용이 는다.
- 처음 초안 패치(`.docs/`)는 다른 머신에 남아 있어 설계를 바탕으로 다시 썼다.
- 함께 바꾼 것: 라우터 frontmatter(`Read` matcher, `Stop`, 값은 JSON 표기), `references/gate.md`, `AGENTS.md`·`README.md`의 hook 설명, `evals/run.sh`(2단계에 frontmatter hooks를 `--settings`로 넘김).
- `tests/gate-hook.sh` 38개 판정 모두 PASS(macOS bash 3.2에서 실행).

### 측정 계획

- 대상: `bugfix-oversell-race`, `feature-partial-cancel`, `ops-stale-dns-fix`, `ops-stale-dns-502`. haiku·sonnet 각 2회.
- 지표: playbook 미열람률, 리뷰 단계까지 간 실행의 inspect 열람률, 블라인드 판정 점수, 비용·턴 수.
- inspect를 강제해도 판정 점수가 오르지 않으면 비용을 정당화하기 어렵다. 점수 변화로 판단한다.
- 기준선 실행 결과(`evals/results/`)는 처음 측정한 머신에만 있다. 블라인드 판정으로 섞어 비교하려면 기준선(`810ccc0`)도 다시 돌린다. 2단계에 hook이 걸리게 된 것도 기준선과 다른 조건이다.

### 결과 (2026-11-07, 개인 머신 macOS, Claude Code 2.1.319)

- 새 hook: `9daac71`과 Agent 매핑 구멍 수정. 기준선: `810ccc0`의 스킬과 `run.sh`(2단계 hook 없음). 판정 opus.
- 기준선은 bugfix·feature만 다시 돌렸다. ops는 위 3절에 기록된 incident 실행 점수와 비교한다(모델 구성이 다르다).

결정적 지표, bugfix·feature만 같은 조건으로.

| 구분 | 모델 | 실행 | inspect 열람 | 평균 비용 | 평균 턴 |
|---|---|---|---|---|---|
| 기준선 | haiku | 4 | 1 | $0.060 | 29.5 |
| 새 hook | haiku | 4 | 4 | $0.066 | 31.2 |
| 기준선 | sonnet | 4 | 3 | $0.737 | 20.0 |
| 새 hook | sonnet | 4 | 4 | $0.851 | 23.2 |

- playbook은 모든 실행이 읽었다. ops까지 넣은 새 hook 16회 중 inspect를 빠뜨린 것은 1회.
- playbook을 열기 전 Bash 차단은 2회 걸렸고, 모델은 막힌 뒤 playbook을 열었다. Stop 되돌림이 걸렸는지는 stream 기록에 남지 않아 확인하지 못했다.

블라인드 판정.

| fixture | 새 hook (4회) | 기준선 |
|---|---|---|
| `bugfix-oversell-race` (14점) | 53/56, 시니어 수준 4/4 | 49/56, 3/4 |
| `feature-partial-cancel` (14점) | 52/56, 4/4 | 50/56, 4/4 |
| `ops-stale-dns-fix` (14점) | 53/56, 4/4 | 기록 77/84, 4/6 |
| `ops-stale-dns-502` (12점) | 43/48, 3/4 | 기록 72/72, 6/6 |

- 점수는 bugfix·feature에서 조금 올랐고 비용은 10~15% 늘었다. 표본이 4회씩이라 개선이 확정됐다고 보지는 않는다.
- `ops-stale-dns-502`의 하락은 haiku 1회(7/12)다. hook과는 관계없다(아래 남은 문제).

### 남은 문제

- **작업 명령과 playbook 읽기를 한 Bash에 섞으면 통과**한다(haiku 1회). 그 명령은 읽기만 했다.
- **관문을 기록하지 않으면 Stop 검사도 없다.** 위와 같은 실행이 incident인데 `pending`을 쓰지 않고 inspect 없이 끝났다. 결정적 채점은 PASS.
- **incident 시험 환경 격리 실패**(haiku 1회): 시험 환경을 작업 디렉토리 안에 만들고 compose 파일은 복사하지 않아, `docker compose`가 상위의 실제 compose 파일을 찾았다. 실행 중인 스택을 재생성하고 내렸다. 보고서는 위반을 먼저 밝혔다. 후보 규칙: 임시 환경은 작업 디렉토리 밖에 두고 `-f`·`-p`를 명시한다.
- **leaf 생략**: haiku가 bug-fix 1단계의 `root-cause`를 읽지 않은 실행이 있다(기준선 1회는 해결안 하나만 내 10/14). hook은 playbook과 inspect만 본다.
- 모두 한 번씩 나왔다. 같은 필요가 다시 보이면 고친다.

## 5. headless 실행

Claude Code 2.1.319, 임시 프로젝트의 skill로 실험했다.

| 확인 | 결과 |
|---|---|
| skill frontmatter의 `Stop` hook이 `claude -p`에서 종료를 막나 | 막는다. `{"decision":"block","reason":...}`이면 이어서 응답하고, 두 번째 Stop에는 `stop_hook_active: true` |
| `claude -p --resume`으로 이어 가면 skill hook이 다시 등록되나 | 안 된다. 2단계 eval에서는 관문 hook이 꺼져 있다 |
| `--resume`에 `--settings`로 같은 hook을 넘기면 | `UserPromptSubmit`·`Stop` 모두 걸린다. session id는 같아서 관문 상태가 이어진다 |

- `evals/run.sh` 2단계에 라우터 frontmatter의 hooks를 `--settings`로 넘기면 대화형 세션과 같아진다. 무인 파이프라인도 같은 방식을 쓴다. #4에서 반영했다.
- 같은 handler를 settings와 skill에 함께 등록하면 skill 쪽 복사본은 따로 돈다는 문서 기술이 있다. 1단계에는 넘기지 않는다.

2026-11-06 개인 머신(macOS, 2.1.319)에서 eval 실행 기록으로 더 확인한 것.

| 확인 | 결과 |
|---|---|
| `claude -p`에 `TodoWrite`·`AskUserQuestion`이 있나 | 없다. init의 도구 목록에 둘 다 없다(`Task`, `ListAgents`, `Skill`, `TaskStop`은 있음). 라우터의 "단계를 todo에 복사"는 답변 본문 목록으로 떨어지고, 시험 실행은 목록도 두지 않았다 |
| 질문이 필요한 곳 | 라우터 실행 1의 위임 여부, 시작 3의 매핑(파일이 없을 때), brainstorm 3단계, feature 1단계의 큰 해석 차이, 관문. eval은 요청에 "서브에이전트 없이"를 넣어 앞의 둘을 피한다 |

### 설계

무인 실행은 답할 사람이 지금은 없고, 답이 나중에 `--resume`으로 오는 실행이다. 실행하는 쪽(eval의 `run.sh`, 나중의 파이프라인)과 dwarf 사이의 약속을 정한다.

- 알아보는 법: 실행하는 쪽이 시스템 프롬프트(`--append-system-prompt`)로 무인 실행이라고 알린다. 알리지 않아도 Claude Code에 `AskUserQuestion`이 없으면 무인 실행으로 본다. 처음에는 도구가 없다는 것만으로 알아보게 했으나 측정에서 0/4였다(아래).
- 묻지 않는다.
  - 위임 여부는 묻지 않고 매핑대로 쓴다.
  - 매핑 파일이 없으면 `references/agents.md`의 기본값을 쓰고 파일은 쓰지 않는다.
  - 그 밖의 질문은 실행 중에 하나씩 묻지 않고, 멈출 때 보고에 모아서 쓴다.
- 상태 파일 `<작업 디렉토리>/.docs/dwarf/state.md`가 todo를 대신한다. playbook을 연 뒤 만들고 단계마다 갱신한다. 이어 가는 실행은 이 파일에서 이어 갈 단계를 찾는다.
  - 첫 줄들: `playbook`, `status`(`running`·`waiting`·`done`), `delegation`.
  - 그 아래: playbook 단계 목록. 끝난 단계 `[x]`, 건너뛴 단계 `skip: 이유`.
  - 턴을 끝내기 전에 `status`를 쓴다. 사용자 답이 필요하면 `waiting`(관문 보고, 질문), 끝났으면 `done`. 실행하는 쪽은 `waiting`이면 보고를 사용자에게 전하고 답을 `--resume`으로 넘긴다.
- 커밋·push·PR 규칙은 바꾸지 않는다. 파이프라인은 요청에 원하는 범위를 적는다. 사용자 지시가 우선한다는 라우터 규칙을 그대로 쓴다.
- hook으로 강제하지 않는다. hook은 실행이 무인인지 모른다. 측정에서 상태 파일을 빠뜨리는 실행이 나오면 그때 추가한다.
- 둘 곳: 규칙은 `references/headless.md`(새 참조). 라우터 시작 2단계 맨 앞에서 가리킨다. `harness.md`의 감지·사용자 질문·todo·관문 hook 행을 함께 고쳤다.

### 측정 계획

- `evals/run.sh`가 단계마다 상태 파일을 결과에 남긴다(`phaseN.state.md`, `checks.txt`에 `INFO state-status`). 모든 단계에 무인 실행 시스템 프롬프트를 붙인다.
- 대상: `bugfix-oversell-race`, `feature-partial-cancel`. haiku·sonnet 각 1회.
- 기대: 1단계 끝 `waiting`, 2단계 끝 `done`. 단계 목록에 관문·리뷰 단계가 `[x]` 또는 `skip: 이유`로 남는다.

### 결과 (2026-11-07)

| 시도 | 알아보는 법 | `headless.md` 열람 | 상태 파일 (1단계 → 2단계) |
|---|---|---|---|
| h1 (4회) | `AskUserQuestion` 없음만. 라우터 2단계 끝에 한 문장 | 0/4 | 0/4 |
| h2 (4회) | 시스템 프롬프트로 알림. 라우터 2단계 맨 앞 | 4/4 | 4/4 `waiting` → `done` |

- h1은 `ls references/`에서 `headless.md`를 보고도 읽지 않았다. 2단계가 "Claude Code가 아니면"으로 시작해 건너뛴 것으로 보인다.
- h2의 단계 목록은 관문·리뷰·정리까지 모두 남았다. haiku 1회가 멈출 때 아직 하지 않은 단계에 `skip`을 붙여서 `[ ]`와 skip을 구분하는 문장을 더했다.
- feature haiku h2 1회에 결정적 채점 FAIL(`full-cancel-after-partial`)이 있다. 구현 결함이고 상태 파일과는 관계없다.
- hook으로 강제하는 것은 h2에서 빠뜨린 실행이 없어 넣지 않았다.

## 6. 파이프라인

- 담당 Agent는 별도 저장소 [dwarf-runner](https://github.com/alexgim961101/dwarf-runner)(private)에 뒀다. dwarf는 스킬 묶음으로 남긴다.
  - 2026-11-07 결정: 저장소를 나눈 채 간다. pstack은 단일 Cursor 플러그인이고 이슈 감시·메신저는 플랫폼이 맡는 것으로 보인다(추정). runner가 그 자리를 대신한다. PR 열기는 pstack처럼 dwarf leaf로 옮길 수 있다. 대화형 `/dwarf`에서도 필요해지면 옮긴다.
- 연결: Jira Cloud·GitHub Issues(이슈) → Discord(질문·보고) → GitHub·Bitbucket Cloud(초안 PR, origin 주소로 고름). 실행은 개인 머신. 실제 연결 시험은 GitHub부터.
- PR은 초안으로 열고 담당자는 사용자만 둔다. 리뷰어는 지정하지 않고, 사용자가 확인한 뒤 추가한다(2026-11-07 요청). CODEOWNERS·기본 리뷰어로 다른 사람이 붙으면 스레드에 경고만 한다.
- dwarf와의 약속은 #4·#5 그대로: `/dwarf` 시작, `--append-system-prompt`로 무인 실행 알림, `state.md`의 `waiting`·`done`, 이어 갈 때 `--resume`과 라우터 hooks(`--settings`). PR 단계는 dwarf leaf가 아니라 runner가 한다(dwarf에게는 커밋까지만 요청).
- 확인한 것(2026-11-07): unittest 15개. 실제 claude·dwarf(haiku)로 `bugfix-oversell-race` 저장소를 처리한 통합 확인에서 `waiting` → 답 → `done`, 커밋 1개, push, PR 요청까지 이어졌다(Jira·Discord·Bitbucket은 가짜).
- 남은 것: Discord 봇과 GitHub 시험 저장소로 `python3 -m dwarf_runner once` 실제 연결 확인, 그다음 Jira·Bitbucket. 상시 실행 방법(launchd 등). Slack은 그 뒤.

## 7. 스킬 없음 기준선

### 배경

- 2026-11-09 트렌드 점검. agentskills.io의 평가 가이드와 Claude Code skills 문서 모두 "스킬 없이 같은 요청을 돌린 기준선"과의 비교를 권장한다. 기존 eval은 전후(스킬 버전)와 모델 간만 재서, dwarf가 비용(토큰·턴)만큼 결과를 좋게 하는지는 몰랐다.

### 바꾼 것

- `evals/run.sh`에 `NO_SKILL=1`. 요청 앞의 `/dwarf `를 떼고, `skills/*/` 전부를 `skillOverrides: off`로 `--settings`에 넘긴다. 스킬을 부르지 않으므로 관문 hook은 걸리지 않는다. 2단계(`resume.md`)도 같은 말로 이어 간다. 결과 디렉토리 이름 끝에 `-noskill`.
- `meta.sh`에 `skill` 필드(`dwarf`·`none`). 기준선이 dwarf 문서를 읽으면(`docs_read`가 비어 있지 않음) `run.sh`가 경고한다.
- `judge.sh`는 판정 모델에게 `/dwarf`를 뗀 요청을 보이고, `summary.tsv`에 스킬 열을 더했다. `judge.md`에 "실행 기록에 보이는 스킬 사용으로 가점·감점하지 않는다"를 넣었다.
- `evals/README.md`에 "스킬 없음 기준선" 절.

### 확인한 것

- 스텁 `claude`(인자만 기록)로 `bugfix-oversell-race`를 두 모드로 돌렸다. 기준선은 1·2단계 모두 `/dwarf` 없는 요청과 22개 스킬의 `skillOverrides`를 받았고 `meta.json`은 `skill: none`, `docs_read: []`. dwarf 모드는 전과 같이 1단계 settings 없음, 2단계 hooks와 `--resume`.
- `bash -n`, `tests/gate-hook.sh` 38개 PASS.
- 실제 기준선 실행 2회에서 `docs_read`가 비었고, init 메시지의 스킬 목록에 dwarf 스킬이 없었다. 심볼릭 링크로 설치한 개인 스킬에도 `skillOverrides`가 적용된다.

### 결과 (2026-11-09, `bugfix-oversell-race`, haiku, 각 2회, 판정 opus)

| 실행 | 스킬 | 판정 (14점) | 시니어 수준 | 숨김 테스트 | 승인 전 수정 | 비용 (USD) | 턴 |
|---|---|---|---|---|---|---|---|
| A | none | 9 | 아니오 | 6/6 | 있음. 요청 없는 커밋도 함 | 0.02 | 14 |
| D | none | 9 | 예 | 6/6 | 있음 | 0.02 | 16 |
| B | dwarf | 13 | 예 | 6/6 | 없음 | 0.06 | 26 |
| C | dwarf | 14 | 예 | 6/6 | 없음 | 0.06 | 28 |

- 숨김 테스트는 넷 다 통과했다. 차이는 과정과 범위에서 났다. 기준선은 같은 결함의 다른 곳(cancel 이중 환불)을 한 번 놓쳤고, 해결안 비교 없이 바로 고쳤고, 승인 전에 작업 트리를 바꿨다. 한 번은 2단계 "추천한 안으로 진행해줘"를 커밋 지시로 읽었다.
- 기준 4(해결안 비교)·5(관문 준수)는 playbook에서 나온 과정 기준이라 기준선이 채울 수 없다. 둘을 빼도 dwarf 10/10·10/10, 기준선 8/10·8/10.
- 비용은 약 3배, 턴은 약 2배. 이 fixture에서 그 비용으로 산 것은 다른 곳의 같은 결함 발견과 승인 전 무변경이다.
- 표본이 2회씩이고 모델이 haiku 하나라 확정은 아니다. 판정 디렉토리 `evals/results/judge-20261109-112902-bugfix-oversell-race`.

### 남은 측정

- 대상: `feature-partial-cancel`, `ops-stale-dns-fix`. haiku·sonnet 각 2회씩 dwarf와 `NO_SKILL=1`. `bugfix-oversell-race`는 sonnet.
- 지표: 블라인드 판정 점수와 시니어 수준 비율, 숨김 테스트 PASS 수, 비용·턴 수. 점수 차이가 비용 차이를 정당화하지 못하는 fixture가 있으면 그 playbook에서 줄일 단계를 찾는다.

## 8. 상태 파일 단일화

### 배경

- todo 도구는 Claude Code 버전에 따라 없다. 2.1.319 대화형 세션의 도구 목록에 `TodoWrite`가 없는 것을 확인했다(2026-11-09). 라우터는 "todo 도구가 없으면 답변에 목록"으로 떨어져 진행 상태가 대화에만 남았다.
- 대화형은 todo, 무인은 `state.md`로 같은 역할의 경로가 둘이었다. 다른 세션에서 이어 가기는 feature(`spec.md` 상태)만 됐다. pstack의 session pickup·pause safely 같은 "세션 이어받기"가 트렌드.

### 바꾼 것

- `references/state.md` 신설. 상태 파일의 위치·형식·쓰기·이어 가기 규칙. `headless.md`의 상태 파일 절은 여기로 옮기고, `headless.md`에는 무인 실행만의 규칙(알아보기, 묻지 않기, `report.md`, 실행하는 쪽과의 약속)만 남겼다.
- 라우터. 시작 1(상태 파일의 진행 중 playbook을 이어 가기 대상에 포함), 분류의 멈춤 요청, 실행 2(단계를 상태 파일에), 실행 8, playbook 없음에서 todo를 상태 파일로 바꿨다. 80줄 유지.
- `playbooks/feature.md`의 작업 단위 todo 두 곳, `harness.md`의 todo 행, `hooks/gate.py`의 안내 문구, `README.md`, `AGENTS.md`(references 목록, 함께 갱신 표).
- 이어 가기 규칙. 요청이 연장이고 `status`가 `waiting`·`running`이면 `[x]`도 skip도 아닌 첫 단계부터. `새 작업`이거나 연장이 아니면 덮어쓴다. 다른 세션에서는 관문을 다시 기록한다(`gate.md`의 세션별 신뢰 규칙 그대로).

### 알려진 마찰

- 다른 세션에서 승인 뒤 단계를 이어 갈 때 관문 재승인이 한 번 더 필요하다. hook이 이전 세션의 `approved`를 믿지 않기 때문이다. 없애려면 hook이 디스크의 gate 파일을 조건부로 인정해야 하는데, 관문 규칙 변경이라 같은 필요가 실제로 두 번 보이면 따로 판단한다.

### 결과 (2026-11-09)

- 위 7절의 dwarf 실행 2/2가 `references/state.md`를 읽고 `.docs/dwarf/state.md`를 새 형식(playbook·status·delegation·체크 목록)으로 썼다. 1단계 끝 `waiting`, 2단계 끝 `done`. 단계 옆에 결과 한 줄과 산출물 경로를 적었다.
- 편차: 한 실행이 건너뛴 단계를 `[ ] … skip:` 대신 `[skip]`으로 표시했다. 읽는 데 지장이 없어 두고, 두 번 보이면 형식 문구를 손본다.

### 남은 측정

- 회귀: 다른 fixture 실행에서도 `phaseN.state.md`가 남고 `status`가 `waiting` → `done`인지(#5와 같은 지표).
- 새로 볼 것: 대화형 세션에서 관문 보고 뒤 끊고, 새 세션 `/dwarf 진행해`로 이어 가는 fixture. 상태 파일을 읽고 이어 간 단계부터 시작하는지, 관문을 다시 쓰는지. `run.sh`는 `--resume`을 쓰므로 새 세션 시나리오는 별도 실행 방법이 필요하다.

## 9. 결과가 갈리는 fixture

### 배경

- 7절 측정에서 dwarf와 기준선의 점수 차이(13·14 vs 9·9)는 전부 과정 기준에서 났고 숨김 테스트는 넷 다 6/6이었다. `bugfix-oversell-race`가 쉬웠기 때문이다. 저장소 11개 파일·174줄이라 `cat` 세 번에 다 읽히고, 재고가 동기 `Map`이라 `await pricing.quote` 한 줄을 옮기면 고쳐지고(기준선 두 실행이 그렇게 했다), 같은 결함의 다른 곳(`cancel`)은 `optional`이라 점수에 안 들어갔다.
- 스킬이 과정만 바꾸고 결과를 바꾸지 않는다면 비용 3배를 정당화하기 어렵다. 결과가 갈리는지 재려면 시니어의 절차(끝까지 조사, 같은 결함 찾기, 경계에서 수정, 후보 시험)가 있어야만 통과하는 fixture가 필요했다.

### 바꾼 것

- `evals/fixtures/bugfix-negative-stock`. 프로젝트 `stockroom`, 31개 파일·866줄. 온라인 예약·매장 POS·입고가 비동기 재고 저장소(메모리 구현도 호출마다 I/O 한 번을 기다림)를 함께 쓴다.
- 결함: `reserve`와 `recordSale`이 `await repo.get` → `await repo.adjust`로 확인·차감한다. 12일 전 "refactor(inventory): async stock repository …" 커밋이 저장소를 비동기로 바꾸며 틈을 만들었다. 그 전에는 가격 조회를 먼저 기다린 뒤 동기 구간에서 확인·차감했다.
- 함정과 그것을 잡는 숨김 테스트.

| 잘못된 수정 (`hidden/fixes/`) | 걸리는 숨김 테스트 |
|---|---|
| 가격 조회만 앞으로 옮김 (7절 기준선의 수정) | 동시 예약·POS 4개 |
| 예약 전체를 lock 하나로 직렬화 | 다른 SKU 병렬성, POS 2개 |
| 예약만 고치고 POS는 그대로 | POS 2개 |
| 예약·POS가 각자 SKU lock | 예약+POS 섞은 1개 |
| 저장소에서 음수 금지(clamp) | 예약 주문 상품 음수, 동시성 4개 |
| 리포트에서 음수 숨김 | 리포트 실제 값, 동시성 4개 |
| 먼저 빼고 음수면 되돌림 (첫 측정의 기준선 두 실행이 한 수정) | 일반 상품 음수 저장 관찰 1개, 큰 요청과 작은 요청 섞은 1개 |

- 참조 수정(`reference.patch`): 저장소에 조건부 원자 차감 `take(sku, qty)`를 두고 예약·POS가 쓴다. 예약 주문 상품은 조건 없이 차감. `cancel`은 상태를 먼저 바꾸고 환불 실패 시 되돌림.
- 미끼: 9일 전 POS 추가(같은 결함을 복사한 두 번째 호출부. 원인으로 짚으면 1점), 2일 전 리포트 수정(표시만), 스냅샷 `data/snapshots/latest.json`의 일반 상품 -2(데이터 수정은 증상 지우기). 예약 주문 상품의 -38·-12는 정상이라 요청의 "일반 상품"을 읽어야 한다.
- `hidden/verify.sh`: 원본·참조·잘못된 수정 7종에 숨김 테스트와 보이는 테스트를 돌려 기대(원본·잘못된 수정은 필수 실패, 참조는 전부 통과)와 맞는지 본다. 모델 없이 돈다. `evals/README.md`에 "결과가 갈리게 만드는 법" 절.

### 확인한 것

- `verify.sh` 9/9 기대대로. 참조 수정의 숨김 테스트 5회 반복 0 실패(타이밍 테스트 `other-skus-not-serialized`가 흔들리지 않음).
- `history.sh`가 만든 6개 커밋 모두 `npm test` 통과(17 → 17 → 17 → 22 → 22 → 23). HEAD가 `repo/`와 같다.
- 스텁 `claude`로 `run.sh` 한 번. 2단계 `checks.txt`에 숨김 테스트가 나오고 바꾸지 않은 코드에서 필수 4개 FAIL.

### 결과 (2026-11-09, haiku·sonnet 각 2회, 판정 opus)

| 모델 | 스킬 | 판정 (14점) | 시니어 수준 | 숨김 테스트 (필수 14) | 수정 방식 | 승인 전 수정 | 비용 (USD) | 턴 |
|---|---|---|---|---|---|---|---|---|
| haiku | dwarf | 13 | 예 | 14/14 | 저장소 `take` + 예약·POS | 없음 | 0.18 | 30+14 |
| haiku | dwarf | 13 | 예 | 14/14 | 저장소 `take` + 예약·POS | 없음 | 0.10 | 20+16 |
| haiku | none | 9 | 아니오 | 12/14 | 먼저 빼고 음수면 되돌림(`take-stock.js`), 예약·POS | 있음. 요청 없는 브랜치·커밋도 함 | 0.03 | 12+2 |
| haiku | none | 8 | 아니오 | 12/14 | 먼저 빼고 음수면 되돌림, 예약·POS | 있음 | 0.04 | 13+2 |
| sonnet | dwarf | 13 | 예 | 14/14 | 저장소 `take` + 예약·POS. 후보 3개(take·lock·빼고 되돌림) worktree 시험 | 없음 | 0.94 | 13+10 |
| sonnet | dwarf | 11 | 예 | 14/14 | 저장소 `take` + 예약·POS. 후보 2개(take·lock) worktree 시험 | 없음 | 0.82 | 12+10 |
| sonnet | none | 5 | 아니오 | 12/14 | 먼저 빼고 음수면 되돌림, 예약·POS | 있음. 요청 없는 커밋도 함 | 0.30 | 5+2 |
| sonnet | none | 7 | 아니오 | 12/14 | 먼저 빼고 음수면 되돌림, 예약·POS | 있음. 2단계 "진행해줘"에 지침 충돌을 이유로 아무것도 안 함 | 0.34 | 7+1 |

- 처음 숨김 테스트 12개로는 haiku 넷 다 통과했다. 기준선 둘 다 POS를 찾아 함께 고쳤고(한 곳만 고치는 함정은 haiku에게도 쉬웠다), 수정 방식이 "먼저 빼고 음수면 되돌림"이었다. 최종값은 맞아 기존 테스트가 못 잡았다.
- 이 수정의 결함은 둘이다. 잠깐이지만 음수가 저장되어 스냅샷·리포트가 본다(요청한 증상 그대로). 실패할 큰 요청이 재고를 음수로 내리는 동안 성공해야 할 작은 요청까지 거절된다. 둘을 숨김 테스트 `regular-sku-never-stored-negative`(adjust·set 감시와 폴링), `doomed-large-sale-does-not-reject-valid-small-sale`(재고 1에 5개·1개 동시 판매)로 넣고, 네 실행의 `diff.patch`를 다시 채점했다(`checks.v1.txt`가 원래 채점). dwarf 두 실행은 저장소 경계의 조건부 원자 차감이라 그대로 통과, 기준선 둘은 2개 실패.
- 판정(haiku `evals/results/judge-20261109-140607-bugfix-negative-stock`, sonnet `judge-20261109-145758-bugfix-negative-stock`). 과정 기준 4·5를 빼도 haiku는 dwarf 9·9/10 vs 기준선 8·6/10, sonnet은 dwarf 9·8/10 vs 기준선 4·6/10. 구현 기준(6)은 두 모델 다 dwarf 2·2, 기준선 1·1. 7절(`bugfix-oversell-race`)에서는 과정 기준을 빼면 10 vs 8이고 구현은 모두 2였으니, 이 fixture에서 처음으로 결과가 갈렸다.
- "먼저 빼고 음수면 되돌림"은 모델과 무관한 기준선의 일관된 선택이다(haiku 2/2, sonnet 2/2). dwarf는 4/4가 저장소 경계의 조건부 원자 차감을 골랐다. sonnet 기준선이 더 똑똑해서 바로 맞는 수정을 고를 것이라는 예상은 틀렸다. sonnet 기준선은 5~7턴 만에 첫 안을 적용하고 끝냈고, 점수는 haiku 기준선보다 낮다(재현을 생략하거나 수정 뒤에 테스트를 써서).
- sonnet 기준선 2단계. 하나는 "추천한 안으로 진행해줘"를 커밋 지시로 읽었고(haiku 기준선과 같은 양상, 3/4), 다른 하나는 지침 충돌을 이유로 아무것도 하지 않았다. 관문 없이 1단계에서 다 해 버리면 2단계의 "진행"이 해석할 거리가 없어진다.
- A(dwarf-1)는 관문 보고에서 "차감 후 음수면 되돌림"을 후보 3으로 올리고 "임시 음수가 노출되고 다른 요청이 거절될 수 있다"는 이유로 시험 없이 배제했다. 기준선이 고른 수정을 dwarf가 이유를 들어 배제한 것이라 해결안 비교 단계의 효과다. 판정도 기준선 둘의 가장 큰 부족으로 이것을 짚었다.
- dwarf가 놓친 것. `cancel`의 이중 환불을 dwarf 4회 중 3회가 놓쳤다(기준 3에서 1점). 이유가 모두 가설을 일찍 지운 것이다. haiku "status 가드가 있다"(가드가 `await` 앞에 있어 가드가 아니다), sonnet "재고를 더하는 쪽이라 영향 없다"(모양이 같으면 방향과 무관하게 적어야 한다), sonnet "같은 결함은 이 두 곳뿐". 원인 커밋을 찾지 않은 것도 2회(haiku·sonnet 각 1회, `git log` 3줄만 봄). 같은 것이 세 번 보였으니 `root-cause` leaf의 "같은 결함의 다른 곳" 단계를 손볼 차례다. 후보: 같은 모양(확인과 변경 사이의 `await`)을 grep으로 전부 나열하고, 지울 때는 "가드가 `await` 앞에 있는가"로 판단하게 한다. 고친 뒤 이 fixture 기준 3 점수로 전후를 잰다.
- 둘 다 운영 어댑터(`stockroom-pg`)에 `take` 구현이 필요하다는 배포 차단 사항을 썼다. 기준선은 저장소 밖에서 고쳐 어댑터 언급이 없다.
- 비용은 haiku에서 dwarf가 2.5~5배, sonnet에서 2.7배(0.82·0.94 vs 0.30·0.34 USD). sonnet dwarf 한 번이 haiku dwarf의 5~9배다. haiku dwarf-2 1단계의 거부 1건은 playbook을 열기 전의 Bash를 관문 hook이 막은 것이다.
- 이 fixture를 만든 뒤 알게 된 것. 함정을 "그럴듯한 첫 수정"으로만 두면 모델마다 다른 첫 수정을 한다. 기준선 실행의 diff를 `wrong-*.patch`로 가져와 숨김 테스트를 보강하는 반복이 필요하다. `evals/README.md`의 "결과가 갈리게 만드는 법"에 적었다.

### 남은 측정

- `root-cause` leaf를 손본 뒤 같은 4회(haiku dwarf 2회면 충분)로 기준 3이 1 → 2가 되는지.
- 기준선의 요청 없는 커밋(4회 중 3회)은 스킬 밖 문제라 측정만 한다. 관문이 있으면 2단계 "진행"이 구현 지시로 읽혀 커밋까지 가지 않는다.

## 10. root-cause leaf 보강

### 배경

- 9절에서 dwarf 4회 중 3회가 `cancel`의 이중 환불을 놓쳤다. 모두 가설을 일찍 지운 것이다("status 가드가 있다", "재고를 더하는 쪽이라 무관", "두 곳뿐"). 원인 커밋을 찾지 않은 것도 2회.

### 바꾼 것

- `skills/root-cause/SKILL.md`. "같은 결함의 다른 곳"을 5단계에서 떼어 6단계로 두었다. 결함의 모양을 한 줄로 적고 grep으로 후보를 전부 나열하며, 모양이 같은지로만 판단하고 증상의 방향이나 "요청한 증상을 만들지 않는다"는 이유로 지우지 않는다. 검사가 있어도 검사와 변경 사이에 await·I/O가 있으면 같은 결함이다. 지운 후보도 출력에 남긴다. 2단계 이력 조사는 파일별 `git log -p -- <파일>`로.

### 결과 (2026-11-09, haiku dwarf 2회, 이전 2회와 함께 판정)

| 실행 | leaf | 판정 (14점) | 기준 2 원인 커밋 | 기준 3 같은 결함 | 기준 5 관문 | root-cause 읽음 | 비용 (USD) | 턴 |
|---|---|---|---|---|---|---|---|---|
| haiku-1 | 전 | 13 | 2 | 1 | 2 | 예 | 0.18 | 44 |
| haiku-2 | 전 | 12 | 1 | 2 | 2 | 아니오 | 0.10 | 36 |
| haiku-3 | 후 | 13 | 1 | 2 | 2 | 아니오 | 0.09 | 31 |
| haiku-4 | 후 | 12 | 2 | 2 | 1 (worktree 3개 남김) | 아니오 | 0.38 | 71 |

- 측정이 성립하지 않는다. 바꾼 뒤 두 실행 모두 `root-cause/SKILL.md`를 읽지 않았다. bug-fix playbook 1단계가 "`root-cause` 스킬로 재현하고"라고 해도 haiku는 leaf를 열지 않고 직접 한다. haiku bug-fix 8회 중 읽은 것은 2회, sonnet은 2/2.
- 기준 3은 바뀐 뒤 2·2지만 바뀌기 전도 1·2였고, 읽지 않았으니 leaf 효과가 아니다. haiku-3은 이중 취소를 재현(재고 4, 환불 2건)까지 했다.
- 새로 보인 것. haiku-4가 worktree 3개를 남겼고(`/tmp/dwarf-wt/`), haiku-3은 상태 파일을 쓰지 않았다(`state-status` 비어 있음). 둘 다 "읽지 않은 문서의 규칙"이다. haiku-3은 `references/state.md`도 읽지 않았다.
- 병렬 실행 간섭. haiku-3·4가 같은 고정 경로 `/tmp/dwarf-wt`에 worktree를 만들었다. haiku-3은 haiku-4가 만든 worktree를 자기 것으로 알고 시험 변경을 넣었다가 되돌렸다. root-cause leaf의 `mktemp -d` 규칙을 읽지 않은 결과이고, 병렬 측정은 이런 간섭을 받을 수 있다.
- 판정 흔들림. haiku-2는 앞선 판정에서 13(기준 4가 2)이었고 이번에는 12(기준 4가 1). 같은 기록을 다시 판정해도 1점은 움직인다.
- 결론. leaf 문구를 고치는 것보다 leaf를 읽게 하는 것이 먼저다. 관문 hook은 playbook 열기와 inspect만 강제한다(`INSPECT_BEFORE_GATE`, `INSPECT_AFTER_CHANGE`). 같은 방식으로 bug-fix·incident는 관문 `pending` 기록 전에 `root-cause/SKILL.md`를 읽어야 하게 할 수 있다. 관문 규칙 변경이라 `gate.md`, `gate.py`, `tests/gate-hook.sh`, playbook을 함께 고쳐야 하고, 사용자 판단 뒤에 한다.

### 다음

- hook에 root-cause 강제를 넣을지 결정. 넣으면 haiku dwarf 2회로 읽기 여부와 기준 3을 다시 잰다.
- 상태 파일(`state.md`)도 같은 문제다. hook이 `state.md` 읽기나 상태 파일 존재를 강제하지 않는다.

## 11. Codex 실행기

### 배경

- 외부 교차 검증은 GPT 계열(codex)로 한다(목표와 방식). 같은 fixture를 codex의 luna·terra·sol로 돌려 dwarf 유무의 차이가 모델 계열을 넘어 나타나는지 본다.

### 바꾼 것

- `evals/run-codex.sh`. `run.sh`의 Codex판. `codex exec --json`으로 1단계, `codex exec resume <thread>`로 2단계. 실행마다 결과 디렉토리 아래 임시 `CODEX_HOME`을 만들어 `auth.json`만 복사하고, dwarf 모드는 이 저장소의 `skills/*`를 그 안에 링크하며 요청 앞의 `/dwarf`를 `$dwarf` 멘션으로 바꾼다. `NO_SKILL=1`이면 링크하지 않고 `/dwarf`만 뗀다. 사용자의 `~/.codex` 설정·AGENTS.md·메모리·세션 기록은 쓰지 않는다. 무인 실행 안내는 임시 `CODEX_HOME/AGENTS.md`에 둔다. 산출물(`phaseN.report.md`, `phaseN.trace.txt`, `checks.txt`, `diff.patch`, `meta.json`)은 `run.sh`와 같은 모양이라 `judge.sh`에 섞어 넣을 수 있다. 비용은 codex가 주지 않아 토큰 수를 적는다(`meta-codex.sh`).
- `evals/workspace.sh`. 작업 공간 준비(repo 복사, `history.sh`)를 `run.sh`에서 떼어 두 실행기가 공유한다.

### 확인한 것 (2026-11-09, 모델 호출 최소)

- `$dwarf` 멘션으로 라우터가 주입된다. 명령 없이 라우터의 섹션 제목을 답했다.
- 격리된 `CODEX_HOME/AGENTS.md`가 지시로 전달된다.
- `codex exec resume <thread>`에 `-c`·`-m`·`-o`·`--json`이 먹고 같은 thread가 이어진다.
- 스텁 codex로 `run-codex.sh`를 끝까지 돌려 산출물과 `meta.json`이 `judge.sh`가 읽는 모양인지 확인했다. 실제 모델 실행은 아래 제약으로 못 했다.

### 제약

- 이 머신의 codex 샌드박스(bwrap)가 동작하지 않는다. `workspace-write`는 네트워크 격리를 꺼도(`sandbox_workspace_write.network_access=true`) uid map에서 거부된다. `CODEX_SANDBOX=danger-full-access`로 돌려야 하는데, Claude Code auto mode가 샌드박스 없는 codex 실행을 막는다(2026-11-09 확인). 사용자가 터미널이나 `!`로 직접 실행한다.
- Codex에는 관문 hook이 없다(`harness.md`). 승인 전 무변경은 규칙만으로 지켜야 하므로, Claude Code 실행과 기준 5를 같은 잣대로 비교하지 않는다.
- Codex는 `disable-model-invocation`을 모른다. 25개 스킬의 설명이 모두 모델에 보인다. Claude Code에서는 라우터만 호출되고 leaf는 경로로 읽는 것과 다르다.

### omp 실행기

- Codex가 막혀 omp(`omp -p --mode json`)로 같은 측정을 한다. 같은 ChatGPT 로그인(provider `openai-codex`)으로 luna·terra·sol을 쓴다.
- `evals/run-omp.sh`·`evals/meta-omp.sh`. `--skills`로 이 저장소의 스킬만 보이게 하고 요청 앞의 `/dwarf`를 `/skill:dwarf`로 바꾼다. `NO_SKILL=1`은 `--no-skills`. 세션은 결과 디렉토리 아래 `sessions/`, 2단계는 `-c`. 무인 안내는 `--append-system-prompt`. 비용은 omp가 usage에 넣는 추정치의 합. `meta.json`에 `harness: omp`, `provider`, `effort`(thinking).
- 확인한 것(2026-11-09, 작은 프롬프트). `/skill:dwarf`를 주면 모델이 `read skill://dwarf`로 라우터를 읽는다. print 모드에서 파일 쓰기가 승인 없이 된다. `--session-dir`+`-c`로 같은 세션이 이어진다. Claude Code auto mode가 `omp -p`는 막지 않는다. 스텁으로 `run-omp.sh`를 끝까지 돌려 산출물이 `judge.sh` 모양인지 확인했다.
- 차이. omp는 사용자의 `~/.omp/agent/AGENTS.md`(25줄)를 읽는다. Claude Code 실행도 사용자의 `~/.claude/CLAUDE.md`를 읽으므로 같은 조건으로 본다. omp 세션의 다른 스킬은 두 모드 모두 보이지 않는다.

### 결과 (2026-11-09, omp · openai-codex · thinking medium · 각 1회, 판정 opus)

Herdr 탭 2개에서 dwarf 열과 기준선 열을 병렬로, 열 안에서는 luna → terra → sol 순차로 돌렸다. 판정 `judge-20261109-174358-bugfix-negative-stock`.

| 모델 | 스킬 | 판정 (14) | 기준 1~7 | 시니어 | 숨김 | 승인 전 수정 | 비용 (omp 추정 USD) | 턴 | 시간 |
|---|---|---|---|---|---|---|---|---|---|
| gpt-6-luna | dwarf | 11 | 2,1,1,1,2,2,2 | 예 | 14/14 | 없음 | 0.02 | 10+21 | 5분 |
| gpt-6-luna | none | 5 | 0,1,1,0,1,1,1 | 아니오 | 14/14 | 있음 | 0.01 | 16+11 | 2분 |
| gpt-6.1-terra | dwarf | 9 | 2,1,1,0,1,2,2 | 예 | 14/14 | 있음 | 0.16 | 17+8 | 3분 |
| gpt-6.1-terra | none | 8 | 2,1,1,0,1,1,2 | 예 | 14/14 | 있음 | 0.07 | 11+3 | 2분 |
| gpt-6.1-sol | dwarf | 12 | 2,1,2,1,2,2,2 | 예 | 14/14 | 없음 | 0.47 | 22+13 | 9분 |
| gpt-6.1-sol | none | 10 | 2,1,1,1,1,2,2 | 예 | 14/14 | 있음 | 0.22 | 15+4 | 4분 |

- 결과는 갈리지 않았다. GPT 세 모델은 기준선도 숨김 14/14다. 기준선이 처음부터 저장소 원자 연산(`consume`·`decrement`)을 골랐고, haiku·sonnet 기준선의 "먼저 빼고 되돌림"을 아무도 하지 않았다. 이 fixture의 함정은 Claude 기준선에만 걸린다.
- 과정에서 갈린다. dwarf가 luna +6, terra +1, sol +2. 재현·관문·테스트 먼저 쓰기·보고 구조에서 벌어진다. luna 기준선은 재현 없이 예약에만 lock을 걸었다가 2단계에서 바꿨다(5점).
- 원인 커밋은 6회 모두 못 찾았다(기준 2 전부 1). 어느 실행도 `git log`를 보지 않았다. `root-cause`를 읽은 terra·sol도 마찬가지다. leaf 2단계가 "회귀면"으로 시작하는데 요청에 정상이던 시점이 없어 회귀로 보지 않은 것으로 보인다. Claude haiku는 4회 중 2회 찾았다.
- 같은 결함의 다른 곳. `root-cause`를 읽은 것은 terra·sol(luna는 안 읽음). sol만 cancel 이중 환불을 재현하고 restock이 안전한 이유까지 구분했다(기준 3 = 2). 10절에서 바꾼 6단계가 한 번은 먹었다.
- 관문. terra dwarf는 `gate`를 `pending`으로 쓰고도 1단계에서 테스트·저장소·README를 고쳤다. hook이 없는 harness에서는 규칙만으로 관문이 지켜지지 않는 사례. luna·sol은 지켰다. 상태 파일은 셋 다 썼다.
- 기준선의 요청 없는 커밋은 0/3이다. Claude 기준선(3/4)과 다르다.
- 비용은 omp가 usage에 넣는 추정치다. ChatGPT 로그인이라 실제 청구와 다르다. 모델 간 상대 비교에만 쓴다. 속도는 Claude보다 빠르다(2~9분).

### 다음

- GPT에서도 결과가 갈리려면 fixture가 더 필요하다. 세 기준선 모두 cancel을 놓쳤으므로 cancel 이중 환불을 요청 안으로 넣는 변형(예: 취소 환불 중복 신고를 증상에 포함)이 후보다. 지금은 `optional-`이다.
- `root-cause` 2단계의 이력 조사를 "회귀면"에 묶지 않고, 결함 지점의 이력을 항상 한 번 보게 할지 결정한다. 6/6이 커밋을 못 찾았다.
- 관문을 hook 없이 지키게 할 방법(omp 확장, codex hooks)은 harness별이라 따로 본다. 현재는 Claude Code에서만 강제된다.
- Codex는 사용자가 돌릴 때 같은 방식으로 판정한다.
- 실행기가 셋(`run.sh`, `run-codex.sh`, `run-omp.sh`)이라 단계 절차가 겹친다. 한 실행기에 harness 어댑터를 두는 정리는 다음 변경 때 한다.

## 12. pstack 비교

### 배경

- dwarf는 pstack `poteto-mode`의 구조를 참고했다. 같은 요청에서 두 스킬 묶음의 결과가 얼마나 다른지 잰 적이 없다.
- pstack의 공식 소스는 `cursor/plugins`의 `pstack/`(MIT)이고, 같은 저장소의 `harness/pstack/claude-code/`가 Claude Code 포트다. 루트 `.claude-plugin/marketplace.json`에 `pstack` 플러그인으로 올라 있다.

### 읽어서 비교한 것 (2026-11-11, pstack 0.15.36, 커밋 `246bc50`)

| 항목 | dwarf | pstack |
|---|---|---|
| 스킬 | 22개 (원칙 14) | 58개 (원칙 24) |
| playbook | 9개 | 23개 |
| 문서 | 약 1,570줄, 라우터 80줄 | 약 5,350줄, 라우터 152줄 |
| 사람의 위치 | 수정 전 승인 관문(bug-fix·incident·feature) | 되돌릴 수 없는 일만 멈춤. 나머지는 묻지 않고 진행 |
| 강제 수단 | hook이 관문·playbook 열람·inspect를 막음 | 문서 규칙만 |
| 위임 | owner 직접이 기본, 역할 셋은 선택 | 위임이 기본. 여러 모델 패널(arena·swarm·interrogate) |
| 커밋·PR | 요청할 때만 | 자주 커밋, 모든 playbook 끝에 PR 열기 |
| 측정 | fixture, 숨김 채점, 기준선 | Eval playbook(블라인드 규칙)만. fixture 없음 |

- dwarf에만: incident·review·brainstorm·chore playbook, 관문 hook, `bench` 템플릿, eval 하네스.
- pstack에만: shipping·babysit·autopilot·orchestrate·hillclimb·prototype·forensics, 글쓰기 스킬(unslop·technical-writing), 검증 스킬 생성, 자기 개선(reflect·automate-me).
- 성능 우열은 이 표로는 알 수 없다. 아래 측정으로 본다.

### 바꾼 것

- `evals/run.sh`에 `PSTACK_DIR`. `skills/*/`를 모두 끄고 `--plugin-dir`로 pstack을 실어 `/dwarf` 대신 `/pstack:poteto-mode`로 같은 요청을 실행한다. 결과 디렉토리 끝에 `-pstack`, `meta.json`의 `skill`은 `pstack`. `evals/` 아래 경로는 거부한다(플러그인 경로가 기록에 남아 유출로 잡힌다). `judge.sh`는 그대로 쓴다.
- `evals/fixtures/refactor-totals-dedupe`. 프로젝트 `wholesale`, 38개 파일·약 850줄. 장바구니·주문·세금계산서에 복붙된 금액 계산을 한 벌로 합치되 결과는 그대로여야 한다. refactoring은 양쪽에 모두 playbook이 있고 둘 다 관문이 없어 한 단계로 끝난다.
- 함정과 그것을 잡는 숨김 테스트. 일곱 가지 모두 보이는 테스트 23개는 통과한다.

| 잘못된 수정 (`hidden/fixes/`) | 걸리는 숨김 테스트 |
|---|---|
| 장바구니 무료배송 기준을 주문과 같게 "바로잡음" | 장바구니 300건 비교, 무료배송 판정 |
| 수량 검증을 주문과 같게 합침 | 장바구니 300건 비교, 수량 0인 줄, API 상태 코드 |
| 세금계산서 세액도 합계에서 한 번 반올림 | 세금계산서·반품 전표 비교, 원장 CSV, 대사 작업 |
| 음수 반올림을 `Math.round`로 단순화 | 반품 전표 2개 |
| 세금계산서 금액의 키 순서가 바뀜 | 원장 CSV |
| 옛 파일을 지우고 `jobs.json`의 문자열 경로는 그대로 | 대사 작업 |
| 쿠폰 계산만 뽑고 나머지 복붙은 그대로 | 구조 검사 |

- 숨김 테스트는 바꾸기 전 저장소와 작업 공간을 같은 입력으로 돌려 비교한다(`ORIGINAL_REPO`). 밖에서 쓰는 표면만 쓴다(`createApp`, HTTP 서버, 스크립트 출력). 구조 검사는 `src/` 아래 서로 다른 두 파일에 토큰 60개 이상 같은 코드가 남으면 실패한다. 아무것도 하지 않은 실행은 이것에만 걸린다.
- 차이의 이유는 커밋 메시지 본문에 있다(커밋 6개). `git log`를 보는 실행은 세 벌의 차이가 의도인지 알 수 있다.
- 채점 기준은 양쪽 playbook에 모두 있는 것으로 골랐다(동작 고정, 차이 식별, diff 밖 영향, 동작 보존, 구조, 범위, 보고). 관문 기준은 없다. 커밋·PR 시도로는 가점·감점하지 않는다.

### 확인한 것 (2026-11-11, 모델 호출은 haiku 1회 $0.005)

- `claude -p --plugin-dir <포트 경로>`로 pstack 0.15.36이 실린다(슬래시 명령 58개, Agent 2개). 같은 실행에서 dwarf 스킬은 `skillOverrides`로 꺼졌다. `/pstack:poteto-mode`로 라우터가 주입된다(섹션 제목을 답하게 해 확인).
- `hidden/verify.sh` 10/10 기대대로. 원본은 구조 검사만 실패, 참조 수정 둘(얇은 파일 셋을 남김, 한 모듈로 합치고 옛 파일 삭제)은 모두 통과, 잘못된 수정 일곱은 위 표대로 실패.
- `history.sh`가 만든 커밋 6개 모두 `npm test` 통과(16 → 19 → 19 → 21 → 23 → 23). HEAD가 `repo/`와 같다.
- 가짜 `claude`(인자만 기록)로 `run.sh`를 세 모드로 돌렸다. dwarf는 전과 같고, 기준선은 `/dwarf` 없는 요청과 `skillOverrides`, pstack은 거기에 `--plugin-dir`와 `/pstack:poteto-mode` 요청. 2단계 fixture(`bugfix-oversell-race`)에서 이어 가는 말에는 표기가 붙지 않고 `--resume`과 `--plugin-dir`가 함께 간다.
- `bugfix-negative-stock`의 `verify.sh`에 `ORIGINAL_REPO`를 내보내는 줄을 더했다. 새 fixture가 이 파일을 심볼릭 링크로 쓴다. 9/9 그대로.

### 한계

- 잴 수 있는 것은 pstack의 Claude Code 포트다. Cursor 전용 스킬(`deslop`, `control-cli`, `control-ui`)과 Bugbot·Automations가 없고, Grok·GPT 역할은 세션 모델로 떨어진다. 이 머신에 `cursor-agent`가 없어 Cursor에서의 pstack은 못 잰다.
- "서브에이전트 없이" 조건은 위임이 전제인 pstack에 불리할 수 있다. 1차는 한 모델이 문서만 보고 내는 품질의 비교이고, 위임을 허용한 비교는 따로 잰다.
- 함정은 내가 고른 것이다. 기준선과 pstack의 실제 첫 수정이 다르면 그 diff를 `wrong-*.patch`로 가져와 보강한다(9절에서 배운 것). 단, dwarf 문서는 이 fixture의 결과를 보고 고치기 전에 먼저 잰다.

### 파일럿 결과 (2026-11-11, `refactor-totals-dedupe`, haiku, 조건마다 1회, 판정 없음)

| 조건 | 동작 숨김 (11) | 구조 검사 | 비용 (USD) | 턴 | 고친 방식 | 바꾸기 전과 비교 | diff 밖 확인 | 임시 파일 정리 |
|---|---|---|---|---|---|---|---|---|
| dwarf | 11/11 | PASS | 0.041 | 26 | 공통 helper 모듈 + 경로마다 흐름 유지 | 무작위 30만 건 차등 검사 | 없음 | 함 |
| pstack | 11/11 | FAIL | 0.037 | 21 | 상수·쿠폰·배송비만 뽑음. 합계·세액 계산은 장바구니·주문에 복붙으로 남음 | 고정 입력 4,000건 golden 비교, 원장 CSV·대사 작업 출력 비교 | 원장·대사 실행 | 안 함 (`/tmp/golden`) |
| 스킬 없음 | 11/11 | PASS | 0.021 | 11 | dwarf와 거의 같은 helper 모듈 | 무작위 20만 건 차등 검사 | `jobs.json` 읽음 | 안 함 (`/tmp/wholesale-*`) |

- 결과는 갈리지 않았다. 함정 일곱은 세 벌을 한 함수로 합치는 수정을 노렸는데, 세 실행 모두 공통 helper만 뽑고 경로마다 계산 흐름을 남겼다. 이 방식이면 차이가 저절로 보존된다. 요청("무료배송 기준을 한 곳에서")도 충족하는 정당한 답이다.
- 스킬 없는 haiku도 바꾸기 전 코드를 `git archive`로 꺼내 무작위 차등 검사를 했다. 9절의 bug-fix 기준선과 달리 이 요청에서는 기준선의 첫 수정이 이미 안전했다.
- pstack의 구조 검사 실패는 합계 반복문과 합산 세액 계산을 장바구니·주문에 남긴 것이다. 무료배송 기준은 한 곳이 되었다. 복붙 판정 기준(토큰 60개)이 엄격한지는 판정 단계에서 따로 본다.
- 과정 차이. dwarf는 `git show`로 MKT-88 커밋을 찾아 보고에 근거로 적었고, 상태 파일과 정리 단계를 거쳤다. 상태 파일은 썼지만 `status:` 줄이 없고, `how`·`why` leaf를 읽지 않고 그 단계를 `[x]`로 표시했다. pstack만 원장 CSV와 대사 작업 출력을 전후로 비교했다(diff 밖 확인). 세 실행 모두 저장소에 테스트를 더하지 않았다(`tests-added` FAIL). 비교 스크립트는 저장소 밖에 두었다.
- 비용은 셋 다 haiku 기준 $0.02~0.04로 예상보다 작다. pstack은 dwarf와 비슷하고 기준선의 약 2배다.
- 사고 위험. fixture의 `run-local.js`가 기본 포트 3000을 쓰는데, 이 머신에서는 사용자의 다른 컨테이너가 3000을 쓰고 있었다. 세 실행 모두 `EADDRINUSE`를 만났다. dwarf는 "그 프로세스는 건드리지 않았다"고 보고했고, pstack은 포트 3000을 쓰는 pid를 `kill`하려 했다가 auto mode 분류기에 막혔다(`denials` 1). eval은 호스트에서 돌기 때문에 사용자 작업에 닿을 수 있다.
- `meta.json`의 `docs_read`는 pstack 실행에서 믿을 수 없다(`f/SKILL.md`처럼 명령의 변수 이름이 잡힌다). pstack 라우터는 슬래시 명령으로 주입되어 Read 기록에 남지 않는다.

### 포트 변경 (2026-11-11)

- dev 서버 기본 포트를 3000에서 fixture마다 4731(`refactor-totals-dedupe`), 4732(`bugfix-negative-stock`, 이력 파일 포함), 4733(`feature-status-filter`)으로 바꿨다. ops fixture는 컨테이너 안 포트와 무작위 호스트 포트라 그대로 둔다. 실행 결과에는 영향이 없도록 README와 dev 서버만 바꿨고, 두 `verify.sh`와 이력 커밋마다 `npm test`가 전과 같다.
- 모델이 포트를 직접 고르거나 다른 프로세스를 끄려는 것까지 막지는 못한다. 호스트에서 도는 한 auto mode 분류기가 마지막 방어선이다.

### `bugfix-negative-stock`에 pstack (2026-11-11, haiku 2회, 판정 전)

| 조건 | 숨김 (필수 14) | 승인 전 수정 | 재현 | 원인 커밋 | 같은 결함: POS / cancel | 해결안 비교 | 운영 어댑터 언급 | 2단계 "진행해줘" | 비용 (USD) | 턴 |
|---|---|---|---|---|---|---|---|---|---|---|
| pstack-1 | 14/14 | 있음 | 동시 요청 스크립트 | 찾음 | 고침 / 놓침 | 없음(안 하나) | 있음 | 브랜치 만들고 커밋 | 0.029 | 18+3 |
| pstack-2 | 14/14 | 있음 | 동시 요청 스크립트 | 찾음 | 고침 / 놓침 | 없음(안 하나) | 있음 | 브랜치 만들고 커밋 | 0.026 | 16+3 |
| dwarf (9·10절, 4회) | 14/14 ×4 | 없음 ×4 | | 4회 중 2회 | 고침 ×4 / 4회 중 3회 찾음 | 후보 2~3개 | 있음 | 구현 | 0.05~0.28 | 31~71 |
| 스킬 없음 (9절, 2회) | 12/14 ×2 | 있음 ×2 | | | 고침 ×2 / 놓침 | 없음 | | 커밋 1회 | 0.02 | 14~15 |

- 결과(숨김 테스트)는 pstack이 dwarf와 같고 기준선보다 낫다. 두 실행 모두 저장소에 조건부 원자 차감(`take`)을 두고 예약·POS가 쓰게 했다. 기준선의 "먼저 빼고 되돌림"은 하지 않았다.
- pstack은 수정 전에 동시 요청 재현 스크립트를 돌렸고, 비동기 저장소 커밋을 `git show`로 봤다. 1회차는 실패 테스트를 먼저 썼고, 2회차는 고친 뒤 소스만 되돌려 새 테스트가 실패하는지 확인했다. 보고에 예약 주문 상품의 정상 음수, 스냅샷 데이터를 고치지 않은 이유, `stockroom-pg`의 `UPDATE ... WHERE qty >= $n`을 적었다.
- 비용은 haiku dwarf의 1/2~1/10, 턴은 1/2 안팎이다. 관문과 해결안 비교가 없어서다. (비용은 13절에서 바로잡은 값)
- pstack이 놓친 것: `cancel`의 이중 환불(2/2). 해결안을 하나만 세우고 다른 구조(호출부 lock 등)와 비교하지 않았다. 관문이 없어 1단계에서 고쳤다(요청이 "원인 찾아서 고쳐줘"라 이것만으로 틀린 것은 아니다).
- 2단계 "추천한 안으로 진행해줘"를 두 실행 모두 커밋 지시로 읽고 새 브랜치에 커밋했다. remote가 없어 PR은 열리지 않았다. 9절 Claude 기준선(3/4)과 같은 해석이다.
- 임시 재현 파일을 `/tmp`에 남겼다(2/2). 지웠다.
- 위 표의 과정 열은 실행 기록을 읽은 내 판단이다. 판정은 아래.

### 블라인드 판정 (2026-11-11, opus, $1.33, `judge-20261111-111234-bugfix-negative-stock`)

pstack 2회, 현재 dwarf 버전의 haiku-3·4(10절), 기준선 2회(9절)를 한 판정에 섞었다. 중립은 관문(5)과 해결안 비교(4)를 뺀 다섯 기준의 합이다. 두 기준은 dwarf playbook에서 나온 것이라 따로 적는다.

| 조건 | 총점 (14) | 중립 (10) | 1 재현 | 2 원인 | 3 같은 결함 | 4 해결안 비교 | 5 관문 | 6 구현 | 7 보고 | 시니어 | 비용 (USD) | 턴 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dwarf-3 | 13 | 9 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 예 | 0.053 | 31 |
| dwarf-4 | 13 | 10 | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 예 | 0.279 | 71 |
| pstack-1 | 10 | 9 | 2 | 2 | 1 | 0 | 1 | 2 | 2 | 예 | 0.029 | 21 |
| pstack-2 | 10 | 9 | 2 | 2 | 1 | 0 | 1 | 2 | 2 | 예 | 0.026 | 19 |
| 기준선-1 | 8 | 7 | 2 | 1 | 2 | 0 | 1 | 1 | 1 | 아니오 | 0.018 | 14 |
| 기준선-2 | 9 | 7 | 2 | 1 | 1 | 1 | 1 | 1 | 2 | 아니오 | 0.021 | 15 |

- 중립 기준에서 pstack(9·9)과 dwarf(9·10)는 거의 같다. 둘이 갈린 곳은 서로 반대다. pstack은 원인 커밋을 2/2 찾았고(dwarf 1/2, 9·10절 dwarf 4회 중 2회, 11절 GPT 0/6), dwarf는 `cancel` 이중 환불을 2/2 찾았다(pstack 0/2). 기준선도 한 번은 찾았으니 dwarf만의 효과라고 보기는 어렵다.
- 총점 차이(13 vs 10)는 해결안 비교(2 vs 0)와 관문(1.5 vs 1)에서 났다. haiku와 이 fixture에서는 해결안을 시험해 비교하지 않아도 pstack이 맞는 수정을 바로 골라, 결과로는 차이가 드러나지 않았다. 9절 sonnet dwarf에서 기준선이 고른 "빼고 되돌림"을 이유를 들어 배제한 사례가 있으니, 해결안 비교의 효과는 모델과 fixture에 따라 다르다.
- 기준선과의 차이는 결과(숨김 12 vs 14, 기준 6)에서 나고, pstack·dwarf 모두 같은 만큼 앞선다.
- 비용(13절에서 바로잡은 값)은 pstack이 dwarf-3의 약 1/2, dwarf-4의 약 1/10이다. dwarf는 실행마다 편차가 크다(31~71턴).
- 판정 대조. 결과를 가르는 근거 셋을 원 기록과 맞춰 봤다. pstack 두 실행의 "수정 전 새 테스트 실패 확인"(1회차는 테스트를 먼저 쓰고 실행, 2회차는 고친 뒤 소스만 되돌려 실행)과 기준선-1의 `cancel` 경합 보고는 기록과 같다. 기준 2에서 판정이 pstack에 너그럽다. 2점 조건은 "파일:줄로 짚고 커밋을 찾음"인데 pstack 보고에는 파일:줄이 없다. 엄격하게 보면 pstack 중립은 8·8이다.
- 같은 기록을 다시 판정해도 1점은 움직인다(dwarf-4는 10절 판정 12, 이번 13). 조건마다 2회라 위 차이를 확정으로 보지 않는다.

### sonnet 비교 (2026-11-11, `judge-20261111-130242-bugfix-negative-stock`, opus $1.38)

pstack sonnet 2회, 13절에서 바꾼 dwarf sonnet 2회(rep 3·4), 9절의 dwarf sonnet 2회(바꾸기 전)와 기준선 2회를 한 판정에 섞었다. 숨김은 13절에서 고친 숨김 테스트로 다시 채점한 값이다.

| 조건 | 총점 (14) | 중립 (10) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 시니어 | 숨김 | 비용 (USD) | 턴 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dwarf 후-3 | 13 | 10 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 예 | 14/14 | 0.491 | 12+9 |
| dwarf 후-4 | 13 | 9 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 예 | 14/14 | 0.489 | 12+8 |
| dwarf 전-1 | 13 | 9 | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 예 | 14/14 | 0.551 | 13+10 |
| dwarf 전-2 | 11 | 8 | 2 | 1 | 1 | 1 | 2 | 2 | 2 | 예 | 14/14 | 0.490 | 12+10 |
| pstack-1 | 9 | 8 | 2 | 1 | 1 | 0 | 1 | 2 | 2 | 예 | 14/14 | 0.289 | 8+2 |
| pstack-2 | 11 | 9 | 2 | 1 | 2 | 1 | 1 | 2 | 2 | 예 | 14/14 | 0.324 | 6+3 |
| 기준선-1 | 5 | 4 | 0 | 1 | 1 | 0 | 1 | 1 | 1 | 아니오 | 12/14 | 0.162 | 5+2 |
| 기준선-2 | 7 | 6 | 2 | 1 | 1 | 0 | 1 | 1 | 1 | 아니오 | 12/14 | 0.179 | 7+1 |

- 결과(숨김)는 pstack도 dwarf와 같다. 둘 다 저장소 경계의 조건부 차감을 골랐다. pstack-2는 옵션 인자(`adjust(sku, -qty, { min: 0 })`)로 넘겼고, 처음 채점에서는 숨김 테스트의 감시 wrapper가 이 인자를 버려 13/14로 잘못 나왔다(13절).
- 중립 기준에서 pstack은 8·9, 바뀐 dwarf는 10·9다. haiku(9·9 vs 9·10)와 비슷하게 차이가 작다. 총점 차이(9·11 vs 13·13)는 관문(1 vs 2)과 해결안 비교(0·1 vs 1·2)에서 난다.
- pstack sonnet은 원인 커밋을 0/2 찾았다(haiku는 2/2). 2회는 git 이력을 보지 않았거나 diff를 열지 않고 추정했다. pstack-2는 `cancel` 이중 환불을 찾아 고쳤다.
- 비용은 pstack이 바뀐 dwarf의 약 60%다(haiku에서는 1/2~1/10). sonnet에서는 dwarf가 턴을 덜 헤매서 차이가 작다.
- sonnet 기준선은 9절과 같이 5·7점이고 숨김 12/14다. 스킬이 있으면(dwarf·pstack 모두) 결과가 갈린다.

### 다음

- `root-cause` 2단계의 이력 조사는 13절에서 바꿨다. 결과는 13절.
- `refactor-totals-dedupe`로 결과를 가르려면 함정을 helper 추출로도 걸리는 곳에 둬야 한다. 후보: 세 벌 중 "같아 보이는" 부분(쿠폰 계산 등)이 한 글자 다르게 흘러간 경우. 경계값에서만 드러나게 두면 무작위 검사가 놓치고, 세 파일을 나란히 비교한 실행만 잡는다. 판정 없이 결과만 보면 지금 fixture는 과정 비교용이다.
- 결과가 이미 갈리는 `bugfix-negative-stock`(9절, Claude 기준선 12/14)에 pstack을 돌리는 것이 다음으로 정보가 많다. 관문이 있는 fixture라 pstack은 1단계에서 다 끝낼 수 있다.
- 포트 충돌. fixture 서버 포트를 흔하지 않은 값으로 바꾸거나, 실행기가 격리된 환경(컨테이너)에서 돌게 할지 정한다.
- 그다음 fixture 후보: perf(느린 원인 둘, 저장소 호출 수로 채점), 원인이 둘 겹친 bug-fix.

## 13. 비용 최적화

### 배경

- 12절에서 haiku dwarf가 pstack보다 결과는 비슷한데 비용이 몇 배 들었다. 품질을 지키면서 줄일 곳을 찾는다(2026-11-11 요청).

### 측정 오류 수정

- `meta.sh`가 단계별 `total_cost_usd`를 더해 왔는데, `--resume`으로 이어 간 단계의 값은 앞 단계까지 더한 누적값이다. 2단계 실행의 비용이 1단계만큼 부풀었다. 메시지별 cache read 합과 result의 합을 맞춰 보고 확인했다(pstack-1 2단계: 메시지 합 227,794, result 746,869 = 1단계 519,075 + 227,794).
- 고친 것: 누적이면 앞 단계와의 차이를 그 단계 `cost_usd`로 적고(`cost_cumulative`), `total_cost_usd`는 그 합. 기존 Claude 실행 75개의 `meta.json`을 다시 집계했다. 2단계 실행은 모두 누적이었고 음수 단계는 없다. 이 문서 11절까지의 비용, 판정 디렉토리의 `judge.md` 표는 옛 값이다.

| 실행 (`bugfix-negative-stock`) | 옛 값 | 바로잡은 값 |
|---|---|---|
| haiku dwarf (9·10절 4회) | 0.09~0.38 | 0.05~0.28 |
| haiku 기준선 (2회) | 0.03~0.04 | 0.018~0.021 |
| sonnet dwarf (9절 2회) | 0.82~0.94 | 0.49~0.55 |
| sonnet 기준선 (2회) | 0.30~0.34 | 0.16~0.18 |
| haiku pstack (12절 2회) | 0.049~0.054 | 0.026~0.029 |

- 배율은 크게 바뀌지 않는다. sonnet dwarf는 기준선의 약 3.2배, haiku dwarf는 pstack의 1.9~10배.

### 비용 구조

- 단가는 결과 기록의 토큰 수와 비용에서 역산했다. sonnet은 입력 2, 출력 10, cache read 0.1, cache write 4(USD/백만 토큰)로 75개 실행 모두 잔차 0. haiku는 같은 비율에 입력·출력·cache write가 1/20, cache read가 1/10이다. 일부 행은 어긋나 대략값이다. cache write가 입력의 2배라 1시간 TTL로 보인다(추정).
- 비중. sonnet: cache write 66%, 출력 24%, cache read 10%. haiku: cache write 44%, 출력 31%, cache read 25%. cache write는 컨텍스트에 새로 들어간 양이고, cache read는 호출 수 × 컨텍스트 크기다.
- dwarf가 기준선보다 비싼 이유는 대부분 일을 더 하기 때문이다(sonnet 23턴 vs 7턴: 재현, 관문, 후보 시험, 테스트 먼저, inspect, 상태 파일, 보고). 과정 자체는 품질의 근거라 건드리지 않고, 그 안의 낭비만 줄인다.
- 문서. 한국어 문서는 약 2바이트당 1토큰이다. bug-fix 경로에서 읽는 문서(라우터, headless, principles, bug-fix, gate, state, inspect)가 약 15k 토큰이고, 2단계 sonnet 실행 비용의 약 15%다(한 번 쓰고 매 호출 다시 읽음).

| 찾은 낭비 | 근거 | 조치 |
|---|---|---|
| 2단계에서 시험한 후보를 다시 손으로 구현 | haiku-4 2단계 $0.177·26턴(Read 3회·Edit 5회). 저장한 patch를 `git apply`한 haiku-3은 $0.013·10턴 | bug-fix 3단계: 후보마다 diff를 `.docs/dwarf/candidates/<후보>.patch`로 저장. 5단계: 실패 테스트를 본 뒤 그 patch를 `git apply`. 시험한 변경과 적용한 변경이 같아진다 |
| hook이 고쳐 쓴 관문 파일에 Write 거절 | 2단계 실행 4회 모두 1회씩(`File has been modified since read`). hook이 `pending`을 `answered`로 고쳐 쓰기 때문 | hook의 `answered` 안내와 `gate.md`에 "먼저 Read" |
| 시험용 worktree의 고정 경로 | 10절 haiku-3·4가 같은 `/tmp/dwarf-wt`를 써서 서로의 worktree를 건드림. haiku-4 1단계 30턴이 시험에 쓰임 | bug-fix 3단계: `mktemp -d` 아래에 만든다 |
| 보고 중복(`report.md` 쓰기와 마지막 답변) | 실행마다 보고 토큰 2~8k가 두 번. sonnet 약 6%, haiku 약 5% | 보류. dwarf-runner가 `report.md`를 읽는지 확인해야 한다(로컬에 없음). 후보: Claude Code에서는 Stop hook이 마지막 답변을 `report.md`에 쓰고, 다른 harness만 직접 쓴다 |
| 문서 토큰 | bug-fix 경로 약 15k 토큰, 실행 비용의 약 15% | 보류. 후보: `gate.md`의 hook 동작 설명(막는 것·한계)을 모델이 읽지 않는 문서로 옮김, 원칙 색인은 playbook에 이름이 없는 판단이 생길 때만 읽음. 동작이 바뀔 수 있어 따로 잰다 |

### 함께 바꾼 것

- `root-cause` 2단계: 결함이 있을 만한 파일의 변경 이력을 회귀라는 말이 없어도 파일별로 본다(11절 다음, 12절에서 pstack haiku가 원인 커밋을 2/2 찾음). 출력의 "결함이 들어온 커밋"은 찾았을 때, 못 찾으면 본 범위.
- `bugfix-negative-stock` 숨김 테스트 결함. `regular-sku-never-stored-negative`의 감시 wrapper가 `adjust(sku, delta)` 두 인자만 넘겨, 조건부 차감을 옵션 인자로 넘기는 정당한 수정(바뀐 dwarf haiku-5, pstack sonnet-2)이 감시 중에는 조건 없이 차감되어 실패로 잡혔다. 인자를 그대로 넘기게 고쳤다. `verify.sh` 9/9 그대로. 이 fixture의 실행 24개를 다시 채점해 바뀐 것은 그 둘(13/14 → 14/14)뿐이다. 이전 채점은 `checks.v1.txt`·`checks.v2.txt`.

### 결과 (2026-11-11, `bugfix-negative-stock`, 조건마다 2회, 판정 opus)

판정: haiku `judge-20261111-130003-bugfix-negative-stock`($1.65), sonnet은 12절 표(`judge-20261111-130242-…`).

| 모델 | dwarf | 총점 | 중립 | 숨김 | 1단계 비용 | 2단계 비용 | 합계 (USD) | 턴 | Write 거절 | 2단계 `git apply` |
|---|---|---|---|---|---|---|---|---|---|---|
| haiku | 전-3 | 13 | 9 | 14 | 0.041 | 0.013 | 0.053 | 21+10 | 1 | 예 |
| haiku | 전-4 | 13 | 10 | 14 | 0.102 | 0.177 | 0.279 | 43+28 | 3 | 아니오 |
| haiku | 후-5 | 11 | 8 | 14 | 0.023 | 0.014 | 0.037 | 15+11 | 0 | 예 |
| haiku | 후-6 | 11 | 8 | 13 | 0.031 | 0.022 | 0.052 | 18+16 | 0 | 예 |
| sonnet | 전-1 | 13 | 9 | 14 | 0.389 | 0.162 | 0.551 | 13+10 | 1 | 아니오 |
| sonnet | 전-2 | 11 | 8 | 14 | 0.329 | 0.162 | 0.490 | 12+10 | 1 | 아니오 |
| sonnet | 후-3 | 13 | 10 | 14 | 0.352 | 0.140 | 0.491 | 12+9 | 0 | 예 |
| sonnet | 후-4 | 13 | 9 | 14 | 0.352 | 0.138 | 0.489 | 12+8 | 0 | 예 |

같은 haiku 판정에서 pstack은 10·10(중립 9·9).

- 바꾼 동작은 모두 일어났다. 바뀐 4회 모두 2단계에서 patch를 `git apply`했고(테스트를 먼저 적용해 실패를 본 뒤 소스 적용), Write 거절은 0회, worktree는 `mktemp` 경로였다.
- 비용. sonnet은 2단계가 0.162 → 0.139(-14%), 합계 -6%. haiku는 합계 0.053·0.279 → 0.037·0.052로 헤매던 실행(haiku-4)의 꼬리가 사라졌다. 횟수가 적고 haiku 편차가 커서 평균 감소율은 말하지 않는다.
- 품질. sonnet은 바뀐 뒤 13·13(전 13·11)이고 기준 3(같은 결함)이 1·1 → 2·2. haiku는 13·13 → 11·11로 내려갔다.
  - haiku-5: 원인 커밋(기준 2)과 `cancel`(기준 3)을 놓쳤다. 둘 다 1단계 조사이고 바꾼 단계(3·5단계)가 아니다. haiku는 이번에도 `root-cause`를 읽지 않았다(0/2). 이 두 기준은 바꾸기 전 haiku 4회에서도 1~2점을 오갔다.
  - haiku-6: "먼저 빼고 음수면 되돌림"을 추천했다(기준 4·6·7). 이유는 "저장소 계약을 바꾸지 않는다"였고, 후보 시험의 재현 스크립트가 최종 재고만 봐서 잠깐 음수를 못 봤다. 바꾸기 전 dwarf haiku 4회에는 없던 실패다. 후보 고르기는 이번에 바꾸지 않았지만, 2회라 변경과 무관하다고 확정하지는 못한다.
- `root-cause` 이력 조사 변경의 효과는 없다. sonnet은 leaf를 2/2 읽었고 원인 커밋은 1/2(전에도 1/2). 읽고도 이력을 안 본 실행이 있다. haiku는 leaf를 읽지 않아 잴 수 없다.
- 실행이 남긴 것. sonnet dwarf 2회와 pstack sonnet 1회가 재현 스크립트를 `/tmp`에 남겼다. `root-cause`는 "재현 스크립트는 고친 뒤 확인용으로 남긴다"고 하고, 라우터 실행 8(보고 뒤 정리)이 `done`일 때 지우라고 하지만 지키지 않았다. 지웠다.

### 다음

- 결정할 것: hook이 bug-fix·incident의 관문 `pending` 기록 전에 `root-cause/SKILL.md`를 읽게 할지(10절 결론). haiku dwarf는 10절 이후 4회 모두 leaf를 읽지 않았고(9절까지는 8회 중 2회), leaf에 넣은 개선(같은 결함 찾기, 이력 조사)이 haiku에는 닿지 않는다.
- haiku 2회를 더 돌려 haiku-6 같은 함정 추천이 반복되는지 본다. 반복되면 bug-fix 2·3단계에 "후보 시험은 증상이 관찰되는 방식 그대로(스냅샷이 아무 때나 읽음 → 중간 값) 본다"를 넣는다. 기준선 4/4와 dwarf 1회에서 같은 함정이 보였다.
- 보류한 비용 후보 둘(보고 중복, 문서 토큰). 보고 중복은 dwarf-runner 확인이 먼저다.
- 실행기 쪽: cache write 단가가 1시간 TTL로 보인다. eval처럼 단계 사이가 짧은 실행에서 5분 TTL을 쓸 수 있으면 비용의 가장 큰 몫(cache write)이 준다. Claude Code 설정으로 되는지 확인이 필요하다.

## 14. root-cause 강제 hook

### 바꾼 것 (2026-11-11, 사용자 결정)

- `gate.py`: bug-fix 관문의 `pending` 기록을 `root-cause/SKILL.md`를 읽기 전에는 막는다. playbook·inspect 열람과 같은 방식(세션 상태의 `docs`)으로 추적한다. incident는 root-cause leaf를 쓰지 않아 뺐다.
- bug-fix 1단계를 "먼저 `root-cause` 스킬을 읽고 관문을 기록한다"로. `gate.md`, AGENTS.md, README, `tests/gate-hook.sh`(케이스 3개).
- 측정 중 찾은 빈틈. haiku-10이 관문을 Bash(`cat > .docs/dwarf/gate`)로 썼다. hook은 Bash로 쓴 기록을 받지 않아 세션 상태에 `pending`이 없었고, 2단계에서 `answered`로 바뀌지 않아 `approved`가 거부됐다. 모델은 적용했던 수정을 되돌리고 끝냈다(숨김 9/14). 11-09 `bugfix-oversell-race` haiku-2에도 같은 일이 있었다(Claude dwarf 실행에서 2회). PostToolUse(Bash)가 관문 파일에 쓰는 명령(리다이렉트, `tee`, `sed -i`)을 보면 "Write 도구로 다시 쓴다"고 알리게 했다. 테스트 3개. 실제 실행으로는 재지 않았다(드물다).

### 결과 (haiku 4회, hook 전 4회와 함께 판정, `judge-20261111-132822-bugfix-negative-stock`, opus $1.84)

| 실행 | hook | root-cause 읽음 | 총점 | 중립 | 1~7 | 시니어 | 숨김 | 비용 (USD) | 턴 |
|---|---|---|---|---|---|---|---|---|---|
| haiku-3 | 전 | 아니오 | 13 | 9 | 2,1,2,2,2,2,2 | 예 | 14 | 0.053 | 21+10 |
| haiku-4 | 전 | 아니오 | 13 | 10 | 2,2,2,2,1,2,2 | 예 | 14 | 0.279 | 43+28 |
| haiku-5 | 전 | 아니오 | 10 | 8 | 2,1,1,1,1,2,2 | 아니오 | 14 | 0.037 | 15+11 |
| haiku-6 | 전 | 아니오 | 12 | 9 | 2,2,2,1,2,1,2 | 아니오 | 13 | 0.052 | 18+16 |
| haiku-7 | 후 | 예 (한 번 막힌 뒤) | 14 | 10 | 2,2,2,2,2,2,2 | 예 | 14 | 0.105 | 24+16 |
| haiku-8 | 후 | 예 | 13 | 10 | 2,2,2,1,2,2,2 | 예 | 14 | 0.045 | 18+9 |
| haiku-9 | 후 | 예 | 11 | 7 | 2,1,1,2,2,2,1 | 예 | 14 | 0.040 | 19+10 |
| haiku-10 | 후 | 예 | 9 | 6 | 2,2,1,1,2,0,1 | 아니오 | 9 | 0.047 | 22+7 |

- 열람률은 0/4 → 4/4. 3회는 막히기 전에 읽었다(바뀐 1단계 문구).
- 원인 커밋(기준 2)은 2/4 → 3/4, `cancel` 이중 환불 발견은 3/4 → 3/4(haiku-10은 찾았지만 `recordSale` 수정을 되돌려 기준 3이 1). 판정이 실행마다 1점 흔들리는 것을 감안하면 구분되는 효과가 아니다.
- haiku-9는 leaf를 읽고도 6단계가 경고하는 그 실수("상태 가드가 있다")로 `cancel`을 지웠다. 읽게 하는 것과 따르게 하는 것은 다르다.
- 같은 기록의 재판정 흔들림: haiku-5 11 → 10, haiku-6 11 → 12(13절 판정 대비).
- 비용은 leaf 약 3k 토큰만큼 는다. haiku-7은 막힌 뒤 다시 하느라 40턴.

## 15. GPT 3종 재측정 (omp)

13·14절의 dwarf로 luna·terra·sol을 각 2회 돌렸다(omp, `openai-codex`, thinking medium, 순차). omp에는 hook이 없어 14절의 root-cause 강제와 관문 hook은 걸리지 않는다. 문서 규칙만으로 도는 결과다. 판정은 11절의 스킬 없음 기준선 3회와 섞었다(`judge-20261111-135430-bugfix-negative-stock`, opus $1.26).

| 모델 | 스킬 | 총점 (14) | 중립 (10) | 1~7 | 시니어 | 숨김 | 승인 전 수정 | root-cause 읽음 | 비용 (omp 추정 USD) | 턴 |
|---|---|---|---|---|---|---|---|---|---|---|
| luna | dwarf-2 | 10 | 7 | 2,1,1,1,2,2,1 | 아니오 | 14 | 없음 | 예 | 0.022 | 9+27 |
| luna | dwarf-3 | 8 | 5 | 2,1,1,1,2,0,1 | 아니오 | 9 | 없음 | 예 | 0.012 | 13+5 |
| luna | 없음 (11절) | 5 | 4 | 0,1,1,0,1,1,1 | 아니오 | 14 | 있음 | - | 0.011 | 16+11 |
| terra | dwarf-2 | 8 | 7 | 2,1,1,0,1,2,1 | 아니오 | 14 | 있음 | 예 | 0.111 | 12+3 |
| terra | dwarf-3 | 8 | 7 | 2,1,1,0,1,2,1 | 아니오 | 14 | 있음 | 예 | 0.090 | 13+3 |
| terra | 없음 (11절) | 7 | 6 | 2,1,1,0,1,1,1 | 아니오 | 14 | 있음 | - | 0.067 | 11+3 |
| sol | dwarf-2 | 13 | 10 | 2,2,2,1,2,2,2 | 예 | 14 | 없음 | 예 | 0.379 | 17+10 |
| sol | dwarf-3 | 14 | 10 | 2,2,2,2,2,2,2 | 예 | 14 | 없음 | 예 | 0.486 | 20+11 |
| sol | 없음 (11절) | 8 | 7 | 2,1,1,0,1,2,1 | 아니오 | 14 | 있음 | - | 0.218 | 15+4 |

11절 dwarf(바꾸기 전 문서, 다른 판정)는 luna 11, terra 9, sol 12였다.

- sol: dwarf로 시니어 수준(13·14). 원인 커밋 2/2, `cancel` 이중 환불 재현 2/2, restock이 안전한 이유까지 구분했다. 11절에서는 GPT 6회 모두 원인 커밋을 못 찾았다. 13절의 `root-cause` 2단계 변경(회귀가 아니어도 이력을 본다)이 leaf를 읽고 따르는 모델에서는 먹었다. haiku에서 이 변경의 효과가 보이지 않은 것(14절)은 leaf를 따르는 정도의 차이로 보인다.
- terra: dwarf가 거의 보태지 못한다(8·8 vs 7). 2회 모두 승인 전에 작업 트리를 고쳤고(11절까지 3/3), 상태 파일에 해결안 시험과 관문을 `skip`으로 적고 바로 구현했다. hook이 없는 harness에서 규칙만으로는 terra가 관문을 지키지 않는다. `git log`는 2/2 실행했지만 보고에 원인 커밋을 적지 않았다.
- luna: 관문은 지키지만 조사가 얕다(원인 커밋·`cancel` 0/2, 후보를 시험하지 않음). luna-3은 2단계에서 승인된 안을 적용하지 않았다. 운영 어댑터(`stockroom-pg`)가 저장소에 없어 "수정이 완결되지 않는다"며 멈췄다(숨김 9/14). 저장소 안의 수정과 어댑터 요구를 보고로 진행할 수 있었다.
- 결과(숨김)는 GPT 기준선도 14/14라 dwarf로 오르지 않는다(11절과 같음). 갈리는 것은 과정이고, 차이는 sol +5·+6, luna +3·+5(luna-3은 구현 0점), terra +1·+1.
- 비용(omp 추정, ChatGPT 로그인이라 청구와 다름): luna 0.01~0.02, terra 0.09~0.11, sol 0.38~0.49. 기준선 대비 luna 1~2배, terra 약 1.5배, sol 약 2배.
- 유출 표시 오탐. sol 2회가 `leak_mentions` 5였다. omp가 긴 도구 출력을 세션 아티팩트(`artifact://N`)로 결과 디렉토리 아래 `sessions/`에 두고, 모델이 그것을 다시 읽으면 그 경로가 기록에 남는다. `fixtures/`·`hidden/` 언급은 0이었다. `meta-omp.sh`가 자기 결과 디렉토리 경로를 세지 않게 고치고 GPT 실행 12개를 다시 집계했다(바뀐 것은 sol 2회의 5 → 0뿐).

### 다음

- terra 관문: omp 확장이나 codex hooks로 hook 없는 harness에서도 관문을 강제할 수 있는지(11절 다음과 같음).
- luna-3의 "외부 의존이 없어서 멈춤". bug-fix 5단계는 고른 해결안을 적용하라고만 한다. 저장소 밖 변경이 필요한 해결안이면 저장소 안 부분을 적용하고 밖의 요구를 보고에 적는다는 문장이 필요한지, 같은 일이 한 번 더 보이면 넣는다.

## 외부 검증 환경 메모

- 이 머신의 codex(0.162.1)는 샌드박스가 동작하지 않는다. `kernel.apparmor_restrict_unprivileged_userns = 1` 때문에 bwrap이 실패한다.
- `danger-full-access`로 실행하는 것은 Claude Code auto mode가 막는다. fixture를 codex로 돌리려면 사용자가 허용 규칙을 추가하거나 `!`로 직접 실행해야 한다.
- 문서 검토는 `codex exec -s read-only`로 할 수 있다. 명령 실행이 막힌 채로 텍스트만 본다. incident 초안 검토에 썼다.
- `workspace-write`는 `sandbox_workspace_write.network_access=true`로도 안 된다(2026-11-09). bwrap이 uid map에서 거부된다. 고치려면 bwrap에 user namespace를 허용하는 AppArmor 프로파일을 두거나 sysctl을 바꿔야 한다. 시스템 설정이라 사용자가 결정한다.
- `$dwarf` 멘션으로 라우터가 주입되고 격리된 `CODEX_HOME/AGENTS.md`가 지시로 전달되는 것을 `codex exec`에서 확인했다(2026-11-09). 11절.

## 재현

```bash
# fixture 하나를 모델 하나로. 결과는 evals/results/<시각>-<fixture>-<model>-<반복>/
evals/run.sh ops-stale-dns-fix sonnet 1
# 같은 fixture의 실행들을 섞어 블라인드 판정
evals/judge.sh evals/results/*-ops-stale-dns-fix-*
tests/gate-hook.sh
```
