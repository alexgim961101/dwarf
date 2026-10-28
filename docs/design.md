# dwarf 설계

- 상태: 초안. 2026-10-20.
- 목적: 공통 개발 작업용 개인 스킬 셋. 단일 진입점 `/dwarf`가 작업을 분류해 playbook을 고르고 그 단계를 수행한다.
- 참고: pstack `poteto-mode`의 라우터·playbook 구조, superpowers의 완료 전 검증 규칙. 구조만 참고하고 문구·코드는 가져오지 않는다.

## 입장

- owner는 메인 세션 하나. 작업의 소유·판단·구현·종합은 owner가 한다.
- 위임은 두 경우만. 대량 읽기(컨텍스트 보호)와 독립 리뷰. 구현 위임은 기본 꺼짐.
- dwarf가 정하는 것은 역할이다. 어떤 역할이 필요하고, 그 역할에 무엇을 어떻게 맡기는지(brief, 위임 지시문)까지.
- 그 역할을 맡을 Agent는 dwarf가 만들지 않는다. 사용자가 자기 환경에 이미 있는 Agent(내장·직접 정의·플러그인) 중에서 역할마다 하나를 고른다. Agent의 도구·시스템 프롬프트와 기본 모델은 그 Agent를 정의한 쪽의 책임이다. 사용자가 역할마다 model·effort를 고르면 dwarf는 위임 호출에 그 값을 넘기기만 한다.
- 자동 트리거 없음. `/dwarf` 명시 호출로만 시작한다.
- 작게 시작한다. playbook·leaf·규칙은 같은 필요가 두 번 보일 때 추가한다.

## 구조

```
/dwarf <목표>
   │
   ▼
[1] 라우터      skills/dwarf/SKILL.md
   │  분류 · "새 작업" 재매칭 · Agent 매핑 적용 · 위임 여부 질문 · playbook 단계를 todo에 복사 · 보고 뒤 정리
   ▼
[2] playbook    skills/dwarf/playbooks/<type>.md
   │  단계 순서 · skip 허용 조건 · 완료 조건 · 보고 항목
   ▼
[3] leaf 스킬   skills/<name>/SKILL.md     ← 단독 호출도 가능. 반복되는 절차만 분리
   ▼
[4] 산출물      <작업 디렉토리>/.docs/ (미결)

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
      playbooks/             # brainstorm, investigation, review, bug-fix, feature, refactoring, perf, chore
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
    bench/SKILL.md           # leaf. 성능 측정 환경. templates/{docker-compose.perf.yml,k6.js,docker-compose.trace.yml,tempo.yml}
    root-cause/SKILL.md      # leaf. 재현과 가설 소거로 처음 잘못된 지점·메커니즘 확정. 수정 없음
    blueprint/SKILL.md       # leaf. 데이터 형태, 대안 비교, 하위 기능과 검증으로 끝나는 작업 단위. 코드 없음
    inspect/SKILL.md         # leaf. 변경·설계 문서를 의도와 대조. 발견 사항·판정, reviewer 위임
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
| reviewer | owner 변경·문서의 독립 리뷰 한 번 | 금지 | `general-purpose` |
| worker | 구현 위임 | 허용 | 없음. owner가 직접 |

- playbook은 역할 이름만 쓴다. Agent 이름은 쓰지 않는다.
- 최초 실행에서 매핑이 없으면 dwarf가 harness의 Agent 후보를 열거해 역할마다 묻고, 선택을 `~/.config/dwarf/agents.md`에 스스로 기록한다. 사용자는 고르기만 한다. `/dwarf agents`로 다시 고른다.
- 매핑은 작업 루트 `.dwarf/agents.md`가 있으면 그것을, 없으면 `~/.config/dwarf/agents.md`를 읽는다. 워크스페이스 전용 조사 Agent(예: retailtrend-agent)를 그 워크스페이스에서만 explorer로 쓰는 첫 필요가 생겨 추가.
- 기록된 Agent가 이 세션에 없으면 기본값으로 대체하고 답변에 한 줄 적는다.
- 역할마다 model·effort를 선택으로 고른다. `/dwarf agents`에서 Agent 다음에 묻고 `<역할>.model`·`<역할>.effort`로 기록해 위임 호출에 넘긴다. 내장 Agent(`Explore`, `general-purpose`)는 정의 파일을 고칠 수 없어 호출 파라미터가 유일한 경로라 추가한 사용자 결정. 기록이 없으면 넘기지 않아 기존 매핑 파일과 호환된다. 후보는 위임 도구가 받는 값이고 모델별 지원 effort는 확인하지 않는다. 지원하지 않는 레벨은 그 이하 최고로 내려 실행되고, 지원 표를 두면 모델이 바뀔 때 낡는다.
  - 검토하고 채택하지 않은 것. 실행마다 선택: 실행 시작 질문이 매번 는다. Agent 정의 파일로만 해결(이전 입장): 내장 Agent에 적용할 수 없다. 버전 고정: `Agent` 호출은 별칭만 받아 dwarf가 할 수 없다. 필요하면 Agent 정의 frontmatter에서 한다.
- 실행마다 위임 여부를 묻는다. playbook을 매칭한 뒤 1단계 전에 "사용 (매핑대로)" / "사용 안 함 (owner가 직접)". 비용·속도·컨텍스트를 실행 단위로 사용자가 정하게 하려는 사용자 결정. 요청에 이미 정해져 있거나, 같은 playbook을 이어 가거나, 매핑을 막 골랐거나, 위임할 Agent가 없으면 묻지 않는다. "사용 안 함"은 그 실행 동안 모든 역할을 `none`으로 보고 매핑 파일은 바꾸지 않는다.
  - 검토하고 채택하지 않은 것. 요청할 때만 끄기(`--solo`, "서브에이전트 없이"): 질문은 줄지만 사용자가 기억해야 한다. 설정으로 매번 묻기 켜기: 설정 항목이 늘고 필요가 아직 없다. 실행 전에는 실제 위임 여부를 모르고(how는 복잡도를 실행 중에 판정) `p-act-before-asking`과도 긴장이 있지만, 사용자가 통제를 택했다.
- 위임 도구가 없는 harness는 모든 역할 "없음". playbook의 모든 단계는 역할이 없어도 owner가 직접 수행할 수 있게 쓴다.
- brief는 자기완결. Agent가 dwarf 파일을 읽지 않아도 일이 되어야 한다. 형식은 `references/roles.md`.
- 위임 여부와 Agent 선택(매핑된 Agent만 쓰고 바꾸지 않음, `none`이나 "사용 안 함"이면 owner가 직접, leaf 단독 호출 시 매핑 읽는 순서)은 `references/roles.md` 한 곳에 두고 how·why·inspect가 참조한다. leaf마다 다른 것은 직접 수행 방식뿐.

## playbook v1

playbook을 따로 두는 기준은 작업 유형이 다를 때. 같은 유형을 어디서 멈추느냐(원인만, 설계만)는 playbook을 나누지 않고 그 playbook의 `**멈춤:**`으로 둔다. 멈춘 뒤 단계는 `skip`으로 남고, 이어 가면 같은 playbook의 skip한 단계부터 수행한다.

분류는 작업 유형을 먼저 고르고 멈춤 여부를 그다음에 본다.

관문은 요청이 없어도 사용자 승인을 기다리는 번호 단계다. 승인되면 다음 단계로 이어 가고, 남은 단계를 skip하는 멈춤과 다르다. feature의 관문 대상(설계 요청, 여러 서브시스템, 작업 단위 다섯 초과)은 스펙(하위 기능 목록 포함) → 독립 검토 → 관문 1을 거쳐 하위 기능마다 구현하고 커밋한다. 방향이 틀린 설계를 구현 전에 막고, 사실 오류는 독립 검토가 먼저 걸러 사용자는 판단만 보게 하려는 사용자 결정. 구현 리뷰는 하위 기능 하나에 커밋 하나로 커밋에서 한다. 관문 1 승인이 하위 기능별 커밋 승인이다(현재 브랜치, push 없음). 하위 기능끼리 같은 파일을 고치면 끝난 뒤 커밋을 나누기 어려워 하위 기능이 끝날 때 커밋한다(사용자 결정, 2026-10-26). 다른 세션은 `spec.md`와 하위 기능 번호를 받아 그 하위 기능만 구현할 수 있다. perf의 측정 설계 관문(본측정 30분 초과 예상이거나 사용자가 설계를 함께 정하자고 할 때)은 설계 문서 → 독립 검토·파일럿 → 관문 1을 거쳐 측정한다. 몇 시간짜리 측정이 증상을 재현하지 않는 부하나 결과를 본 뒤 바뀐 판정 기준 때문에 통째로 버려지는 것을 막으려는 사용자 결정(2026-10-23. 목록 API 지연 검증에서 검토가 판정 기준의 결함을, 파일럿이 증상을 재현하지 않는 부하를 측정 전에 잡았다). bug-fix는 항상 관문 1을 거친다. 해결안 후보(세 개까지)를 별도 worktree에서 재현 명령과 기존 테스트로 시험하고, 비교표와 추천을 보고해 사용자가 고른 해결안으로 고친다. 글로만 정한 해결안은 틀려도 구현 뒤 검증에서야 드러나고, 사용자는 확인되지 않은 해결안을 승인하게 되기 때문이다. 후보가 둘 이상이고 worker 매핑이 있으면 후보마다 worker가 동시에 시험하고, 포트·DB·컨테이너를 함께 쓰면 하나씩 시험한다. 구현 뒤 검증이 두 번 실패하면 더 고치지 않고 멈춘다. 관문 1 보고와 최종 보고는 개요·재현·원인·해결 방법·검증·확인하지 못한 것으로 된 형식 하나를 같이 쓰고, 프로젝트 코드를 모르는 개발자도 흐름을 이해할 수 있게 쓴다. 보고서 파일(`.docs/bug-fix/`)은 사용자가 요청할 때만 남긴다(사용자 결정, 2026-10-28).

- 검토하고 채택하지 않은 것. 모든 feature에 관문: 작은 변경에 검토와 승인이 붙는다. 같은 세션의 자기 검토: 작성자와 맹점이 같다. 검토 반복: 검토는 한 번, 발견 사항마다 반영·기각을 보이고 재검토는 사용자가 요청할 때만. 하위 기능마다 사용자 확인: 관문 1에서 순서까지 승인했고, 커밋으로 리뷰하며, 확인 실패·차단 항목에서 멈추면 충분하다. 하위 기능별 계획 파일과 관문 2(2026-10-22~26): 사용자가 계획 파일을 읽지 않고 커밋된 코드를 확인했다. 분할 검토는 스펙 검토로, 진행 상태는 스펙의 하위 기능 절로 옮기고, 작업 단위는 문서 없이 세션 todo로 둔다.

- 검토하고 채택하지 않은 것. 코드 변경 여부를 분류의 첫 기준으로 두고, 변경 없는 짝(diagnosis = bug-fix 1단계, design = feature 1~3단계)을 별도 playbook으로 둠(v1). 같은 유형이 두 갈래로 흩어지고, 멈추는 방식이 별도 playbook과 perf 내부 멈춤 둘이 됐다. 변경 없는 가지에 perf 짝이 없어 "배포 후 느려짐, 원인만"이 성능 측정 없는 diagnosis로 갔다(서브에이전트 판정 3/3).

playbook은 다른 playbook을 포함하지 않는다. playbook은 순서·멈춤·보고·재라우팅을 맡고, 둘 이상에서 반복되는 절차는 leaf로 내려 순서대로 부른다. 기준은 "leaf 스킬" 절.

- 검토하고 채택하지 않은 것.
  - playbook이 다른 playbook을 단계로 포함. 포함될 때 보고·멈춤을 끄는 두 번째 실행 방식이 생기고 playbook 간 의존이 생긴다.
  - 라우터가 요청마다 playbook 여러 개를 골라 순서를 정함. 필수 선행 단계가 매 요청의 판단에 달리고 라우팅 테스트가 순서열 비교가 된다. 서로 다른 유형을 섞은 복합 요청(예: refactoring 뒤 perf)이 두 번 보이면 재검토.

| playbook | 목적 | 입력 | 산출물 |
|---|---|---|---|
| brainstorm | 무엇을 할지 함께 정함. 코드 없음 | 막연한 목표·문제 | 문제 정의, 성공 기준, 대안 비교표, 추천, 다음 단계 |
| investigation | 질문에 답함 | 질문 | 근거 붙은 설명 또는 비교표가 있는 권고. 외부 기술 비교는 출처·버전 명시. 정형 템플릿(답·흐름·관련 테스트·근거), 요청 시 `.docs/investigation/`에 문서 |
| review | 기존 변경 판정 | diff·브랜치·PR | 발견 사항(위치·근거·심각도)과 판정 |
| bug-fix | 결함을 원인에서 고침 | 재현 가능한 결함 | 재현 → 원인 → 해결안 후보 worktree 시험 → 관문 1(비교표·추천) → 고른 해결안 구현 → 같은 곳에서 검증(두 번 실패하면 멈춤). 변형: 간헐적, 회귀. 멈춤: 관문 1에서 원인·해결안 보고 |
| feature | 설계 뒤 하위 기능 순서대로 구현 | 요구 | 스펙(데이터 형태·대안·하위 기능 목록) → 검토·관문 1 → 하위 기능별 구현·확인·점검·커밋 → 검증. 관문 대상이 아니면 문서·검토·관문 없이 진행하고 커밋은 요청 시. 변형: 소(3~5단계 skip). 문서는 `.docs/feature/<날짜>-<주제>/spec.md` 하나. 하위 기능 절이 완료 조건·테스트 케이스 ID(C1…, T1…)를 참조하고, 테스트 케이스는 상황 → 기대 결과(정상·경계·실패). 작업 단위는 세션 todo로만 두고, 구현은 작업 단위마다 테스트 먼저. 스펙 상태(승인 대기·승인됨)와 하위 기능 상태(대기·진행 중과 차단 요약·완료와 커밋 SHA)로 다른 세션이 이어 갈 단계를 정한다. 검토 기록은 `spec.md` 검토 절. 멈춤: 5단계 뒤(관문 1 승인은 구현 지시가 아님) |
| refactoring | 동작은 그대로, 구조 변경 | 판단이 필요한 구조·이름 변경 요구 | 동작 불변 근거와 함께 구조 변경. 멈춤: 3단계 뒤 목표 구조와 변경 순서 |
| perf | 동작은 그대로, 측정으로 개선 | 느림·자원 과다 | 재현(느려졌으면 정상 버전과 비교)·기준선 → limiter·원인 → (본측정이 길면) 측정 설계·검토·파일럿·관문 1 → 원인 제거 실험 → 수정 → 사후 측정 → 숫자 설명. bench로 같은 조건 보장. 보고서는 `.docs/perf/<날짜>-<주제>/report.md`. 멈춤: 7단계 뒤 원인 보고서(개요·재현·원인 분석·원인 제거 전후 비교·수정 방향) |
| chore | 정해진 변경, 설계 없음 | 자명한 작업 | 변경과 검증 출력. 의존성·설정·문서·테스트 추가, 결과가 정해진 이름·위치 변경 |
| (없음) | | 어디에도 맞지 않음 | todo에 `playbook 없음: 이유`. 원칙과 완료 전 검증만 적용 |

- 흐름: brainstorm(무엇) → feature 1~5단계(스펙·하위 기능 목록, 관문 1) → 6단계부터(하위 기능마다 구현·커밋). 각 단계에서 멈추고 사용자 결정으로 다음으로 넘어간다.
- 재라우팅: brainstorm·investigation·review 도중이나 멈춤으로 수행하는 중에 변경이 필요하면 알리고 제안만. 멈춘 뒤 "고쳐"·"진행"은 같은 playbook의 skip한 단계부터 앞 결과를 재사용. chore에서 판단이 생기면 동작이 그대로면 refactoring, 바뀌면 feature. refactoring·perf에서 동작 변경이 필요하면 멈춤.
- refactoring과 chore의 경계는 "무엇으로 바꿀지 판단이 필요한가". v1은 chore에 "이름"을 두고 refactoring을 "구조 변경"으로만 적어, "의도가 드러나게 이름 변경"이 chore로, "utils/로 옮겨"가 refactoring으로 두 번 연속 반대로 분류됐다(라우팅 11·27).
- brainstorm은 질문이 주 도구인 유일한 playbook. `p-act-before-asking`의 예외로 명시.

- 라우터는 Claude Code에서 `references/harness.md`를 읽지 않는다. 문서가 Claude Code 용어로 쓰여 있어 다른 도구일 때만 매핑이 필요하다. 실행당 읽기 한 번을 줄인다.
- 라우터는 매칭한 playbook의 단계를 todo에 그대로 복사한다. 건너뛰는 단계는 `skip: 이유`로 남긴다.
- "새 작업" 또는 "new task"로 시작하는 요청은 진행 중 playbook을 버리고 재매칭한다.
- 사용자가 playbook이나 단계를 이름으로 지정하면 분류보다 우선한다.
- 모든 playbook은 완료 전 검증으로 끝난다. 검증 명령을 실제로 실행하고 출력을 본 뒤에만 완료라고 말한다.
- 보고 뒤 이번 실행이 만든 자원(컨테이너, 서버·백그라운드 프로세스, worktree, bisect 상태, 임시 도구·파일)을 정리한다. 보고서·아티팩트와 실행 전부터 있던 것은 남기고, 멈춤으로 끝나도 정리한다. leaf의 정리(root-cause 계측 제거, bench 정리)는 그대로 두고 라우터가 마지막에 한 번 더 확인한다. 사용자 요청으로 추가.

## 원칙

- 원칙 하나는 `skills/p-<name>/SKILL.md` 하나. 25줄 이내. 언제 / 규칙 / 왜 / 방법 / 아닌 것.
- 색인은 `skills/dwarf/references/principles.md`. 라우터가 시작 시 색인을 읽고, 적용하는 원칙만 leaf를 읽는다. leaf를 읽은 원칙 중 결정을 바꾼 것만 답변에 이름과 바뀐 결정을 적는다.
- 접두사 `p-`는 leaf 스킬과 구분하고 `/` 메뉴에서 한 덩어리로 모이게 하기 위한 것. pstack의 `principle-`와 같은 역할.
- playbook과 leaf 스킬은 판단 단계 옆에 `p-<name>`을 적고, 절차 단계에는 붙이지 않는다.
- 14개. 범위 4(`p-necessary-only`, `p-reuse-first`, `p-respect-structure`, `p-finish-in-scope`), 설계 2(`p-model-the-domain`, `p-fix-root-causes`), 검증 4(`p-prove-it-works`, `p-verifiable-units`, `p-test-behavior`, `p-explain-the-number`), 진행 4(`p-guard-context`, `p-act-before-asking`, `p-summary-first`, `p-unify-units`). pstack tdd의 "나쁜 테스트보다 테스트 없음", 실패 먼저 확인 규칙은 `p-test-behavior`에 흡수. 네 개는 전역 CLAUDE.md 구현 원칙에서 왔고, 다른 harness로 가져가기 위해 저장소에 둔다.
- `p-summary-first`는 2차 후보 minimize-reader-load를 사용자 요청으로 당겨 왔다. 모든 답변에 걸리므로 playbook·라우터 단계에 붙이지 않고 색인의 "언제"로만 건다. 라우터 본문과 색인은 둘 다 시작 시 한 번 읽혀 단계에 붙여도 시점이 달라지지 않는다. 보고가 여전히 길면 그때 붙일 곳을 정한다. 전역 지침의 "불필요한 설명 없이"는 군더더기를 빼는 것, 이 원칙은 핵심은 모두 두되 핵심마다 설명을 짧게 하고 깊은 설명은 질문으로 받는 것. 글의 구조는 바꾸지 않는다. 용어 풀이·구간 이름·그림 축 규칙과 외부 공유 글 규칙(내 머신 경로 없이, 증거 중심, 과정·정정 이력 제외)은 풀지 않은 용어와 로컬 흔적 때문에 사용자가 막힌 일이 반복돼 더했다(2026-10-23).
- `p-unify-units`는 사용자 요청으로 추가. 보고에서 같은 양을 ms와 초로 번갈아 적어 혼동한 일이 반복됐다. `p-explain-the-number`는 숫자가 무엇을 쟀는지(타당성), 이 원칙은 숫자를 어떻게 적는지(표기)라 나눈다. 수치가 나오는 모든 답변에 걸리므로 색인의 "언제"로 걸고, 단위를 정하는 perf 1단계와 `bench` 보고에만 붙인다.
- `p-explain-the-number` 갱신(2026-10-23, 사용자 요청). 반복 기본을 5회에서 3회로 줄이고 범위가 겹치거나 판정이 경계면 늘린다. 겹친 범위를 "효과 없음"으로 적었다가 뒤집힌 일, n≈30의 p99가 최댓값 한 건이었던 일, 계측이 다른 요청의 span을 섞은 일이 있어 판정 기준 사전 고정, "차이 없음"은 허용 폭으로만 판정, 백분위 옆 n, 측정 도구의 불변식 검사를 더했다.
- 2차 후보와 미룬 이유: attack-the-premise(수정 두 번 실패 뒤에 걸림. bug-fix 6단계가 두 번째 실패에서 멈추고 두 시도가 함께 기댄 가정을 보고하는 것으로 일부를 맡는다), exhaust-the-design-space(prototype 없음), separate-shared-state·idempotent(병렬 worker는 bug-fix 해결안 시험뿐이고, 공유 자원 규칙은 그 단계에 한 줄로 둔다), build-the-lever·encode-lessons(dwarf 자체를 키울 때).

## leaf 스킬

- 분리 기준. 셋 다 맞을 때만 leaf로 둔다.
  - 두 개 이상 playbook에서 같은 내용으로 반복된다. 유형별 변형이 대부분이면 playbook에 남긴다. 잘게 쪼개면 파일만 늘고 흐름이 흩어진다.
  - 여러 줄의 절차다. 한 줄짜리는 playbook이나 원칙에 둔다.
  - playbook 없이도 입력·출력이 성립한다. leaf는 playbook을 모르므로 단독으로 의미가 있어야 한다.
- 책임. leaf는 절차와 출력을 정한다. 멈춤·사용자 보고 항목·다음 playbook은 쓰지 않는다. 그건 playbook과 라우터의 몫.
- 분리 완료: `how`(동작·구조 파악. 7개 playbook에서 반복), `why`(동기·이력 조사. 4개 playbook에서 반복). why는 출처별 playbook을 `references/sources/`에 둔다. v1은 소스 관리(항상)와 Jira(Atlassian MCP가 보일 때) 둘. 문서·채팅·관측은 brief의 일반 지시로 조사하고, 같은 출처가 두 번 필요해지면 추가. 구조는 pstack how·why(MIT)를 참고했고 문장은 새로 썼다. pstack과 다른 점은 종합을 별도 explainer·synthesizer가 아니라 owner가 하고, 모델을 dwarf가 정하지 않는 것(사용자가 고른 model·effort만 넘긴다).
- 분리 완료: `blast-radius`(변경이 diff 밖의 어디를 깨뜨리나. 확신 5단계 사다리와 안전 근거 하나의 실행 증명. investigation·review·feature·refactoring·chore 5곳). `bench`(성능 측정 환경과 N회 교대 측정. perf 전용이지만 compose·k6 템플릿을 동반하는 절차라 playbook 안에 둘 수 없어 leaf. 함수 계측은 요청 안 구간 시간과 함수 하나 비교. 원인 찾기는 추적(OpenTelemetry 자동 계측 → Tempo, TraceQL로 조회. Grafana 없이 API) → 서비스별 전용 프로파일러(언어 프로파일러, `EXPLAIN ANALYZE`, `SLOWLOG`) 순서로 보고하지 않는 run에서만. 추적은 DB 쿼리·외부 호출·직렬화 중 어디서 시간이 가는지를 프로파일보다 먼저 보여 주고, 프로파일은 추적이 가리킨 곳에 집중한다. 계측·프로파일 의존성은 적극 설치하되 측정 이미지 안 → 측정용 worktree 순서이고 단독 도구는 설치 없이 실행. 작업 트리·lockfile·전역 환경은 바꾸지 않는다. 추적 도입은 사용자 요청). 둘 다 구조는 pstack blast-radius·benchmark-checklist 참고, 문장은 새로 썼다.
- 분리 기준의 예외: 템플릿·스크립트 같은 파일을 동반하는 절차는 한 playbook만 써도 leaf로 둔다.
- 기준 미달 상태로 유지: `root-cause`·`blueprint`는 diagnosis·design을 bug-fix·feature의 멈춤으로 합치면서 쓰는 playbook이 하나씩으로 줄었다. 단독 호출(`/root-cause`, `/blueprint`)로 입력·출력이 성립하고 여러 줄의 절차라 그대로 둔다. playbook으로 되돌릴지는 미결.
- 분리 완료: `root-cause`(재현·가설 소거·메커니즘. bug-fix. perf의 원인 파악은 측정 기반이라 제외), `blueprint`(데이터 형태·대안 비교·하위 기능·작업 단위. feature 3단계가 부른다. bug-fix·perf의 "함수 경계를 넘으면 대안 둘"은 한 줄이라 playbook에 둔다), `inspect`(점검 목록·발견 사항 형식·reviewer 위임. review·bug-fix·feature·refactoring·perf. playbook마다 다른 중심 질문은 입력으로 받는다. 대상은 변경과 설계 문서. 문서 검토는 feature만 쓰지만 판정·reviewer 위임이 같아 새 leaf를 두지 않고 점검 목록과 reviewer brief만 문서용을 둔다). 각 leaf는 상태·미결·판정을 돌려주고, 그것을 보고 멈출지는 playbook이 정한다.
- 이름은 답하는 질문 기준. playbook 이름(design·review)과 Claude Code 내장 `code-review`를 피했다. spec은 요구 명세로 읽혀 입력(완료 조건)과 헷갈리고, plan은 plan mode와 겹쳐 쓰지 않았다.
- 분리하지 않는 것. 검증·구현·커밋 준비는 유형별 규칙이 대부분이다(재현 통과·사후 측정·전후 테스트 동일, 실패 테스트 먼저·가설 하나씩, 커밋 배열). 검증 공통부는 라우터 완료 전 검증과 `p-prove-it-works`가 맡는다. 요구 다시 쓰기는 한 줄. 기존 후보 verify·ship은 같은 이유로 내린다.
- pstack에서 검토하고 채택하지 않은 것. architect·arena·swarm·interrogate(다중 후보·다중 모델 병렬. agent 하나 입장과 어긋남. 예외로 bug-fix 해결안 시험은 arena를 줄여 쓴다. 후보는 owner가 정하고 worker는 시험만 하며, 결과를 섞거나 판정 패널을 두지 않는다), figure-it-out(design과 "playbook 없음"이 대신), show-me-your-work(자율 실행 없음), unslop·technical-writing(문체는 전역 지침), typescript-best-practices(언어별은 프로젝트 소유), in-your-own-words·sharpen(brainstorm·design·feature 1단계에 흡수), teach(investigation이 대신), no-comments(inspect 점검 목록 한 줄로 흡수), poteto-help·setup-pstack·automate-me·make-bot-ui·bro(Cursor·pstack 전용).
- 2차 후보: recall(세션 맥락 복원), ketchup(대화 따라잡기), correct(반복 실수를 구조로 막기. p-encode-lessons와 함께), reflect(dwarf 자체 개선), create-verification-skill(앱을 사용자처럼 구동하는 프로젝트 전용 검증 스킬 생성). 필요가 두 번 보이면 추가.
- leaf는 `/how`, `/why`처럼 단독 호출도 된다. `disable-model-invocation: true`, 라우터와 playbook은 `<dwarf>/../<name>/SKILL.md` 경로로 읽는다.

## 하지 않는 것

- dwarf가 정하는 모델·effort 기본값. Agent 정의 파일. 페르소나 Agent.
- 세션 지속성 hook. compaction 후 드리프트가 실제로 보이면 검토.
- PR 운영·배포·오케스트레이션 playbook. 배포·롤백·데이터 재계산·force push는 `~/skills`의 운영 스킬 영역.
- 학습 자료·문서 생성 자체가 목적인 작업.
- 2차 playbook 후보: onboard(저장소 전체 파악 문서). 2차 leaf 후보는 "leaf 스킬" 절에.

## 미결

| 항목 | 선택지 | 임시 기본값 |
|---|---|---|
| 산출물 위치 | 프로젝트 `.docs/` / `docs/` / 산출물 없음 | `<작업 디렉토리>/.docs/` (gitignore 권장). 작업 디렉토리는 세션을 시작한 디렉토리. 저장소 루트·상위 디렉토리·스킬 디렉토리가 아님. 이름은 `<playbook>/YYYY-MM-DD-<영문 kebab 주제>` |
| 커밋·PR 시점 | playbook이 자동으로 / 사용자 요청 시만 | 사용자 요청 시만. playbook은 "커밋 준비"까지. 예외: feature 관문 1 승인은 하위 기능별 커밋 승인(현재 브랜치, push 없음. 2026-10-26 사용자 결정) |
| Pi·OMP·Codex 매핑 | 각 도구 확인 후 채움 | Claude Code만 확정, 나머지 미확인 표기 |
| 쓰는 playbook이 하나인 leaf(`root-cause`, `blueprint`) | leaf 유지 / playbook에 다시 넣기 | leaf 유지. 단독 호출과 절차 길이 때문 |
