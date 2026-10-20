# dwarf 설계

- 상태: 초안. 2026-10-20.
- 목적: 공통 개발 작업용 개인 스킬 셋. 단일 진입점 `/dwarf`가 작업을 분류해 playbook을 고르고 그 단계를 수행한다.
- 참고: pstack `poteto-mode`의 라우터·playbook 구조, superpowers의 완료 전 검증 규칙. 구조만 참고하고 문구·코드는 가져오지 않는다.

## 입장

- owner는 메인 세션 하나. 작업의 소유·판단·구현·종합은 owner가 한다.
- 위임은 두 경우만. 대량 읽기(컨텍스트 보호)와 독립 리뷰. 구현 위임은 기본 꺼짐.
- dwarf가 정하는 것은 역할이다. 어떤 역할이 필요하고, 그 역할에 무엇을 어떻게 맡기는지(brief, 위임 지시문)까지.
- 그 역할을 맡을 Agent는 dwarf가 만들지 않는다. 사용자가 자기 환경에 이미 있는 Agent(내장·직접 정의·플러그인) 중에서 역할마다 하나를 고른다. Agent의 모델·도구·시스템 프롬프트는 그 Agent를 정의한 쪽의 책임이다.
- 자동 트리거 없음. `/dwarf` 명시 호출로만 시작한다.
- 작게 시작한다. playbook·leaf·규칙은 같은 필요가 두 번 보일 때 추가한다.

## 구조

```
/dwarf <목표>
   │
   ▼
[1] 라우터      skills/dwarf/SKILL.md
   │  분류 · "새 작업" 재매칭 · playbook 단계를 todo에 복사 · Agent 매핑 적용
   ▼
[2] playbook    skills/dwarf/playbooks/<type>.md
   │  단계 순서 · skip 허용 조건 · 완료 조건 · 보고 항목
   ▼
[3] leaf 스킬   skills/<name>/SKILL.md     ← 단독 호출도 가능. 반복되는 절차만 분리
   ▼
[4] 산출물      <프로젝트>/.docs/ (미결)

공유 참조       skills/dwarf/references/{roles,agents,harness,principles}.md
```

의존 방향은 위에서 아래로만. leaf는 playbook과 라우터를 모른다. 참조 문서는 모든 층이 읽고 어느 층도 수정하지 않는다.

## 디렉토리

```
dwarf/
  README.md
  docs/design.md             # 이 문서
  install.sh                 # skills/ 하위 디렉토리를 각 도구의 skills/ 에 심볼릭 링크. --tool, --uninstall, 스킬명 선택
  skills/
    dwarf/
      SKILL.md               # 라우터. 80줄 상한
      playbooks/             # brainstorm, investigation, review, diagnosis, design, bug-fix, feature, refactoring, perf, chore
      references/
        roles.md             # 역할 정의와 brief 계약
        agents.md            # Agent 선택 절차와 기록 형식
        harness.md           # 도구별 기능 매핑
        principles.md        # 원칙 색인. 언제 걸리는지와 leaf 링크
    p-<name>/SKILL.md        # 원칙 leaf. 규칙·이유·방법. 적용할 때만 읽음
    how/SKILL.md             # leaf. 동작·구조 파악. explorer 팬아웃, owner 종합
    why/SKILL.md             # leaf. 동기·이력 조사. 출처별 explorer, 신뢰도 등급
    why/references/          # investigator-brief.md, sources/{source-control,jira}.md
    blast-radius/SKILL.md    # leaf. 변경이 diff 밖의 어디를 깨뜨리나. 안전의 근거 하나를 실행으로 증명
    bench/SKILL.md           # leaf. 성능 측정 환경. templates/{docker-compose.perf.yml,k6.js}
    <leaf>/SKILL.md          # 2개 이상 playbook에서 반복되는 절차만
  tests/
    routing.md               # 프롬프트 → 기대 playbook
```

- 스킬은 `skills/` 아래에 둔다. Claude Code 플러그인이 스킬을 찾는 위치와 같아 나중에 `.claude-plugin/plugin.json`·hooks를 추가해도 파일을 옮기지 않는다.
- 파일명은 영문 kebab, 본문은 한국어 개조식.

## 역할과 Agent

| 역할 | 할 일 | 쓰기 | 기본 (Claude Code) |
|---|---|---|---|
| explorer | 대량 읽기·탐색. 포인터로 보고 | 금지 | `Explore` |
| reviewer | owner 변경의 독립 리뷰 한 번 | 금지 | `general-purpose` |
| worker | 구현 위임 | 허용 | 없음. owner가 직접 |

- playbook은 역할 이름만 쓴다. Agent 이름은 쓰지 않는다.
- 최초 실행에서 매핑이 없으면 dwarf가 harness의 Agent 후보를 열거해 역할마다 묻고, 선택을 `~/.config/dwarf/agents.md`에 스스로 기록한다. 사용자는 고르기만 한다. `/dwarf agents`로 다시 고른다.
- 매핑은 작업 루트 `.dwarf/agents.md`가 있으면 그것을, 없으면 `~/.config/dwarf/agents.md`를 읽는다. 워크스페이스 전용 조사 Agent(예: retailtrend-agent)를 그 워크스페이스에서만 explorer로 쓰는 첫 필요가 생겨 추가.
- 기록된 Agent가 이 세션에 없으면 기본값으로 대체하고 답변에 한 줄 적는다.
- 위임 도구가 없는 harness는 모든 역할 "없음". playbook의 모든 단계는 역할이 없어도 owner가 직접 수행할 수 있게 쓴다.
- brief는 자기완결. Agent가 dwarf 파일을 읽지 않아도 일이 되어야 한다. 형식은 `references/roles.md`.

## playbook v1

playbook을 따로 두는 기준은 산출물이 다르거나 소유 선언이 다를 때. 산출물이 같고 단계만 건너뛰면 같은 playbook의 변형(`skip`).

| playbook | 소유 선언 | 입력 | 산출물 |
|---|---|---|---|
| brainstorm | 질문을 소유. 코드 없음 | 막연한 목표·문제 | 문제 정의, 성공 기준, 대안 비교표, 추천, 다음 단계 |
| investigation | 답을 소유 | 질문 | 근거 붙은 설명 또는 비교표가 있는 권고. 외부 기술 비교는 출처·버전 명시 |
| review | 판정을 소유 | diff·브랜치·PR | 발견 사항(위치·근거·심각도)과 판정 |
| diagnosis | 진단을 소유, 수정은 아님 | 증상·로그 | 원인 보고서. bug-fix 1·2단계에서 멈춤 |
| design | 설계를 소유, 코드는 아님 | 정해진 요구 | 설계·계획 문서. feature 1~4단계에서 멈춤 |
| bug-fix | 작업을 소유 | 재현 가능한 결함 | 재현 → 원인 → 최소 수정 → 같은 표면 검증. 변형: 간헐적, 회귀 |
| feature | 설계를 소유 | 요구 | 데이터 형태 → 설계 → 작은 단위 구현·검증. 변형: 소(설계·계획 skip), 대(design 먼저) |
| refactoring | 계약을 소유 | 구조 변경 요구 | 동작 불변 근거와 함께 구조 변경 |
| perf | 측정을 소유 | 측정된 느림·자원 과다 | 기준선 → limiter → 수정 → 사후 측정 → 숫자 설명. bench로 같은 조건 보장 |
| chore | 변경을 소유, 설계 없음 | 자명한 작업 | 변경과 검증 출력. 의존성·설정·문서·테스트 추가·이름 |
| (없음) | | 어디에도 맞지 않음 | todo에 `playbook 없음: 이유`. 원칙과 완료 전 검증만 적용 |

- 흐름: brainstorm(무엇) → design(어떻게) → feature(구현). 각 단계에서 멈추고 사용자 결정으로 다음으로 넘어간다.
- 재라우팅: 변경 없는 playbook 도중 변경이 필요하면 알리고 제안만. diagnosis → bug-fix 3단계, design → feature 5단계로 앞 결과를 재사용. chore에서 설계 판단이 생기면 feature, refactoring·perf에서 동작 변경이 필요하면 멈춤.
- brainstorm은 질문이 주 도구인 유일한 playbook. `p-act-before-asking`의 예외로 명시.

- 라우터는 Claude Code에서 `references/harness.md`를 읽지 않는다. 문서가 Claude Code 용어로 쓰여 있어 다른 도구일 때만 매핑이 필요하다. 실행당 읽기 한 번을 줄인다.
- 라우터는 매칭한 playbook의 단계를 todo에 그대로 복사한다. 건너뛰는 단계는 `skip: 이유`로 남긴다.
- "새 작업" 또는 "new task"로 시작하는 요청은 진행 중 playbook을 버리고 재매칭한다.
- 사용자가 playbook이나 단계를 이름으로 지정하면 분류보다 우선한다.
- 모든 playbook은 완료 전 검증으로 끝난다. 검증 명령을 실제로 실행하고 출력을 본 뒤에만 완료라고 말한다.

## 원칙

- 원칙 하나는 `skills/p-<name>/SKILL.md` 하나. 25줄 이내. 언제 / 규칙 / 왜 / 방법 / 아닌 것.
- 색인은 `skills/dwarf/references/principles.md`. 라우터가 시작 시 색인을 읽고, 적용하는 원칙만 leaf를 읽는다. leaf를 읽은 원칙 중 결정을 바꾼 것만 답변에 이름과 바뀐 결정을 적는다.
- 접두사 `p-`는 leaf 스킬과 구분하고 `/` 메뉴에서 한 덩어리로 모이게 하기 위한 것. pstack의 `principle-`와 같은 역할.
- playbook과 leaf 스킬은 판단 단계 옆에 `p-<name>`을 적고, 절차 단계에는 붙이지 않는다.
- v1 12개. 범위 4(`p-necessary-only`, `p-reuse-first`, `p-respect-structure`, `p-finish-in-scope`), 설계 2(`p-model-the-domain`, `p-fix-root-causes`), 검증 4(`p-prove-it-works`, `p-verifiable-units`, `p-test-behavior`, `p-explain-the-number`), 진행 2(`p-guard-context`, `p-act-before-asking`). pstack tdd의 "나쁜 테스트보다 테스트 없음", 실패 먼저 확인 규칙은 `p-test-behavior`에 흡수. 네 개는 전역 CLAUDE.md 구현 원칙에서 왔고, 다른 harness로 가져가기 위해 저장소에 둔다.
- 2차 후보와 미룬 이유: attack-the-premise(수정 두 번 실패 뒤에 걸림), exhaust-the-design-space(prototype 없음), separate-shared-state·idempotent(병렬 worker 없음), build-the-lever·encode-lessons(dwarf 자체를 키울 때), minimize-reader-load(reviewer brief 한 줄이 먼저).

## leaf 스킬

- 원칙: 두 개 이상 playbook에서 같은 절차가 반복될 때만 leaf로 분리한다.
- 분리 완료: `how`(동작·구조 파악. 7개 playbook에서 반복), `why`(동기·이력 조사. 4개 playbook에서 반복). why는 출처별 playbook을 `references/sources/`에 둔다. v1은 소스 관리(항상)와 Jira(Atlassian MCP가 보일 때) 둘. 문서·채팅·관측은 brief의 일반 지시로 조사하고, 같은 출처가 두 번 필요해지면 추가. 구조는 pstack how·why(MIT)를 참고했고 문장은 새로 썼다. pstack과 다른 점은 종합을 별도 explainer·synthesizer가 아니라 owner가 하고, 모델을 지정하지 않는 것.
- 분리 완료: `blast-radius`(변경이 diff 밖의 어디를 깨뜨리나. 확신 5단계 사다리와 안전 근거 하나의 실행 증명. investigation·review·feature·refactoring·chore 5곳). `bench`(성능 측정 환경과 N회 교대 측정. perf 전용이지만 compose·k6 템플릿을 동반하는 절차라 playbook 안에 둘 수 없어 leaf). 둘 다 구조는 pstack blast-radius·benchmark-checklist 참고, 문장은 새로 썼다.
- 분리 기준의 예외: 템플릿·스크립트 같은 파일을 동반하는 절차는 한 playbook만 써도 leaf로 둔다.
- 분리 후보: verify(완료 전 검증 체크리스트), ship(커밋 배열·PR).
- pstack에서 검토하고 채택하지 않은 것. architect·arena·swarm·interrogate(다중 후보·다중 모델 병렬. agent 하나 입장과 어긋남), figure-it-out(design과 "playbook 없음"이 대신), show-me-your-work(자율 실행 없음), unslop·technical-writing(문체는 전역 지침), typescript-best-practices(언어별은 프로젝트 소유), in-your-own-words·sharpen(brainstorm·design·feature 1단계에 흡수), teach(investigation이 대신), no-comments(review 3단계 한 줄로 흡수), poteto-help·setup-pstack·automate-me·make-bot-ui·bro(Cursor·pstack 전용).
- 2차 후보: recall(세션 맥락 복원), ketchup(대화 따라잡기), correct(반복 실수를 구조로 막기. p-encode-lessons와 함께), reflect(dwarf 자체 개선), create-verification-skill(앱을 사용자처럼 구동하는 프로젝트 전용 검증 스킬 생성). 필요가 두 번 보이면 추가.
- leaf는 `/how`, `/why`처럼 단독 호출도 된다. `disable-model-invocation: true`, 라우터와 playbook은 `<dwarf>/../<name>/SKILL.md` 경로로 읽는다.

## 하지 않는 것

- 모델·effort 설정 파일. Agent 정의 파일. 페르소나 Agent.
- 세션 지속성 hook. compaction 후 드리프트가 실제로 보이면 검토.
- PR 운영·배포·오케스트레이션 playbook. 배포·롤백·데이터 재계산·force push는 `~/skills`의 운영 스킬 영역.
- 학습 자료·문서 생성 자체가 목적인 작업.
- 2차 playbook 후보: onboard(저장소 전체 파악 문서). 2차 leaf 후보는 "leaf 스킬" 절에.

## 미결

| 항목 | 선택지 | 임시 기본값 |
|---|---|---|
| 산출물 위치 | 프로젝트 `.docs/` / `docs/` / 산출물 없음 | `.docs/` (gitignore 권장) |
| 커밋·PR 시점 | playbook이 자동으로 / 사용자 요청 시만 | 사용자 요청 시만. playbook은 "커밋 준비"까지 |
| Pi·OMP·Codex 매핑 | 각 도구 확인 후 채움 | Claude Code만 확정, 나머지 미확인 표기 |
