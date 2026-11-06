# 개선 진행 기록

dwarf를 어디까지 개선했는지와 다음에 이어 갈 곳. 측정 방법은 `evals/README.md`.

## 목표와 방식

- 목표: 모든 playbook·leaf가 대부분의 모델에서 시니어 개발자 수준의 결과를 낸다.
- 최종 형태: 사용자에게 배정된 Jira·GitHub 이슈를 감시하고, 이슈마다 담당 Agent가 dwarf와 서브에이전트로 처리한다. 중간에 Slack·Discord로 의견을 묻고, 사용자가 최종 리뷰할 PR을 연다. 느려도 된다. 담당 Agent(감시·실행·메신저)는 dwarf 스킬 밖에 둔다.
- 개선마다 `evals/`로 전후를 잰다. 결정적 채점(`check.sh`)과 블라인드 판정(`judge.sh`)을 함께 본다.
- 외부 교차 검증은 GPT 계열 모델(codex·omp)로만 하고 effort를 명시한다. 예: `codex exec -m gpt-6.1-sol -c model_reasoning_effort=high`.

## 항목 상태 (2026-11-06)

| # | 항목 | 상태 |
|---|---|---|
| - | eval 하네스, 관문 hook, bug-fix·root-cause 보강 | 완료 (`9653ab7`) |
| - | 판정 자료에 도구 출력 앞뒤 포함(`phaseN.trace.txt`) | 완료 |
| 3 | `incident` playbook (실행 중인 시스템의 장애) | 완료. 남은 문제 아래 |
| 4 | 단계 생략 방지 (playbook 미열람, inspect 생략) | 완료. 측정 결과와 남은 문제 아래 |
| 5 | headless 실행 상태 (todo 대신 상태 파일, `--resume` hook) | 미착수. 확인한 사실만 아래 |
| 6 | 파이프라인 (Jira intake, Slack 질의, PR leaf) | 미착수 |

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

## 5. headless 실행 (확인한 사실)

Claude Code 2.1.319, 임시 프로젝트의 skill로 실험했다.

| 확인 | 결과 |
|---|---|
| skill frontmatter의 `Stop` hook이 `claude -p`에서 종료를 막나 | 막는다. `{"decision":"block","reason":...}`이면 이어서 응답하고, 두 번째 Stop에는 `stop_hook_active: true` |
| `claude -p --resume`으로 이어 가면 skill hook이 다시 등록되나 | 안 된다. 2단계 eval에서는 관문 hook이 꺼져 있다 |
| `--resume`에 `--settings`로 같은 hook을 넘기면 | `UserPromptSubmit`·`Stop` 모두 걸린다. session id는 같아서 관문 상태가 이어진다 |

- `evals/run.sh` 2단계에 라우터 frontmatter의 hooks를 `--settings`로 넘기면 대화형 세션과 같아진다. 무인 파이프라인도 같은 방식을 쓴다.
- 같은 handler를 settings와 skill에 함께 등록하면 skill 쪽 복사본은 따로 돈다는 문서 기술이 있다. 1단계에는 넘기지 않는다.

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
