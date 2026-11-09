# 개선 진행 기록

dwarf를 어디까지 개선했는지와 다음에 이어 갈 곳. 측정 방법은 `evals/README.md`.

## 목표와 방식

- 목표: 모든 playbook·leaf가 대부분의 모델에서 시니어 개발자 수준의 결과를 낸다.
- 최종 형태: 사용자에게 배정된 Jira·GitHub 이슈를 감시하고, 이슈마다 담당 Agent가 dwarf와 서브에이전트로 처리한다. 중간에 Slack·Discord로 의견을 묻고, 사용자가 최종 리뷰할 PR을 연다. 느려도 된다. 담당 Agent(감시·실행·메신저)는 dwarf 스킬 밖에 둔다.
- 개선마다 `evals/`로 전후를 잰다. 결정적 채점(`check.sh`)과 블라인드 판정(`judge.sh`)을 함께 본다.
- 외부 교차 검증은 GPT 계열 모델(codex·omp)로만 하고 effort를 명시한다. 예: `codex exec -m gpt-6.1-sol -c model_reasoning_effort=high`.

## 항목 상태 (2026-11-09)

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
| 9 | 결과가 갈리는 fixture (`bugfix-negative-stock`) | 완료. haiku 첫 측정에서 숨김 테스트가 갈렸다(dwarf 14/14, 기준선 12/14). 결과 아래 |

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

### 결과 (2026-11-09, haiku, 각 2회, 판정 opus)

| 실행 | 스킬 | 판정 (14점) | 시니어 수준 | 숨김 테스트 (필수 14) | 수정 방식 | 승인 전 수정 | 비용 (USD) | 턴 |
|---|---|---|---|---|---|---|---|---|
| A | dwarf | 13 | 예 | 14/14 | 저장소 `take` + 예약·POS | 없음 | 0.18 | 30+14 |
| C | dwarf | 13 | 예 | 14/14 | 저장소 `take` + 예약·POS | 없음 | 0.10 | 20+16 |
| D | none | 9 | 아니오 | 12/14 | 먼저 빼고 음수면 되돌림(`take-stock.js`), 예약·POS | 있음. 요청 없는 브랜치·커밋도 함 | 0.03 | 12+2 |
| B | none | 8 | 아니오 | 12/14 | 먼저 빼고 음수면 되돌림, 예약·POS | 있음 | 0.04 | 13+2 |

- 처음 숨김 테스트 12개로는 넷 다 통과했다. 기준선 둘 다 POS를 찾아 함께 고쳤고(한 곳만 고치는 함정은 haiku에게도 쉬웠다), 수정 방식이 "먼저 빼고 음수면 되돌림"이었다. 최종값은 맞아 기존 테스트가 못 잡았다.
- 이 수정의 결함은 둘이다. 잠깐이지만 음수가 저장되어 스냅샷·리포트가 본다(요청한 증상 그대로). 실패할 큰 요청이 재고를 음수로 내리는 동안 성공해야 할 작은 요청까지 거절된다. 둘을 숨김 테스트 `regular-sku-never-stored-negative`(adjust·set 감시와 폴링), `doomed-large-sale-does-not-reject-valid-small-sale`(재고 1에 5개·1개 동시 판매)로 넣고, 네 실행의 `diff.patch`를 다시 채점했다(`checks.v1.txt`가 원래 채점). dwarf 두 실행은 저장소 경계의 조건부 원자 차감이라 그대로 통과, 기준선 둘은 2개 실패.
- 판정(`evals/results/judge-20261109-140607-bugfix-negative-stock`). 과정 기준 4·5를 빼도 dwarf 9·9/10, 기준선 8·6/10. 구현 기준(6)은 dwarf 2·2, 기준선 1·1. 7절(`bugfix-oversell-race`)에서는 과정 기준을 빼면 10 vs 8이고 구현은 모두 2였으니, 이 fixture에서 처음으로 결과가 갈렸다.
- A(dwarf-1)는 관문 보고에서 "차감 후 음수면 되돌림"을 후보 3으로 올리고 "임시 음수가 노출되고 다른 요청이 거절될 수 있다"는 이유로 시험 없이 배제했다. 기준선이 고른 수정을 dwarf가 이유를 들어 배제한 것이라 해결안 비교 단계의 효과다. 판정도 기준선 둘의 가장 큰 부족으로 이것을 짚었다.
- dwarf가 놓친 것. A는 `cancel`을 "status 가드가 있다"며 가설에서 지워 이중 환불을 놓쳤다(기준 3에서 1점). C는 `git log`를 3줄만 보고 원인 커밋을 찾지 않았다(기준 2에서 1점). 둘 다 root-cause 단계가 가설을 너무 일찍 지우거나 이력을 얕게 본 것이다. 같은 것이 한 번 더 보이면 `root-cause` leaf를 손본다.
- 둘 다 운영 어댑터(`stockroom-pg`)에 `take` 구현이 필요하다는 배포 차단 사항을 썼다. 기준선은 저장소 밖에서 고쳐 어댑터 언급이 없다.
- 비용은 dwarf가 2.5~5배, 턴은 약 3배. dwarf-2 1단계의 거부 1건은 playbook을 열기 전의 Bash를 관문 hook이 막은 것이다.
- 이 fixture를 만든 뒤 알게 된 것. 함정을 "그럴듯한 첫 수정"으로만 두면 모델마다 다른 첫 수정을 한다. 기준선 실행의 diff를 `wrong-*.patch`로 가져와 숨김 테스트를 보강하는 반복이 필요하다. `evals/README.md`의 "결과가 갈리게 만드는 법"에 적었다.

### 남은 측정

- sonnet dwarf 2회·`NO_SKILL=1` 2회. sonnet 기준선이 조건부 원자 차감을 바로 고르면 이 fixture도 sonnet 이상에는 쉬운 것이다.
- 기준선 2회 더 돌려 "먼저 빼고 되돌림"이 haiku의 일관된 선택인지 본다.

## 외부 검증 환경 메모

- 이 머신의 codex(0.162.1)는 샌드박스가 동작하지 않는다. `kernel.apparmor_restrict_unprivileged_userns = 1` 때문에 bwrap이 실패한다.
- `danger-full-access`로 실행하는 것은 Claude Code auto mode가 막는다. fixture를 codex로 돌리려면 사용자가 허용 규칙을 추가하거나 `!`로 직접 실행해야 한다.
- 문서 검토는 `codex exec -s read-only`로 할 수 있다. 명령 실행이 막힌 채로 텍스트만 본다. incident 초안 검토에 썼다.

## 재현

```bash
# fixture 하나를 모델 하나로. 결과는 evals/results/<시각>-<fixture>-<model>-<반복>/
evals/run.sh ops-stale-dns-fix sonnet 1
# 같은 fixture의 실행들을 섞어 블라인드 판정
evals/judge.sh evals/results/*-ops-stale-dns-fix-*
tests/gate-hook.sh
```
