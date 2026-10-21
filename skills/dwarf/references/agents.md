# Agent 선택

Agent는 dwarf가 만들지 않는다. 사용자가 자기 환경에 이미 있는 Agent 중에서 역할마다 하나를 고르고, 원하면 위임할 때 쓸 model·effort도 고른다. dwarf는 그 선택을 기록만 한다. 사용자가 파일을 만들거나 고치지 않는다.

## 어디서 읽나

1. 작업 루트의 `.dwarf/agents.md`. 현재 디렉토리에서 위로 올라가며 처음 만나는 것. 프로젝트나 워크스페이스 전용 Agent(예: 특정 워크스페이스 조사자)를 그 안에서만 쓰고 싶을 때 둔다. git 레포가 아닌 루트에도 둘 수 있다.
2. 없으면 `~/.config/dwarf/agents.md`.

둘 다 같은 형식. 작업 루트 파일은 사용자가 직접 두거나 `/dwarf agents --here`로 dwarf가 쓴다. 작업 루트 파일에 없는 역할은 사용자 홈 파일의 값을 쓴다. 역할의 model·effort는 그 역할의 Agent를 읽은 파일에서만 읽는다.

## 언제

- 읽을 파일 어디에도 현재 harness 블록이 없을 때, 첫 `/dwarf` 실행에서.
- `/dwarf agents`로 다시 고를 때.
- 기록된 Agent가 이 세션에 없을 때는 묻지 않는다. 기본값으로 대체하고 답변에 한 줄 적는다.

## 절차

1. 후보 열거.
   - Claude Code: 세션 컨텍스트의 "Available agent types" 목록. 추가로 `~/.claude/agents/*.md`와 `<프로젝트>/.claude/agents/*.md`의 `name`. 플러그인 Agent는 `<plugin>:<name>` 표기 그대로.
   - Pi: `~/.pi/agent/agents/*.md`. 세션에서 보이는 방식은 미확인.
   - OMP: `~/.omp/agent/config.yml`의 agent 이름. 미확인.
   - 위임 도구가 없는 harness: 모든 역할을 "없음"으로 기록하고 묻지 않는다.
2. 역할마다 하나씩 묻는다. Claude Code는 `AskUserQuestion` 한 번에 세 문항. 다른 도구는 번호 목록으로 묻고 답을 받는다. 기본값을 첫 옵션에 두고 "(기본)"을 붙인다. "없음 (owner가 직접)"을 항상 포함한다.

   | 역할 | 질문 | 기본 |
   |---|---|---|
   | explorer | 코드 탐색과 대량 읽기를 맡길 Agent는? | `Explore` |
   | reviewer | 독립 리뷰를 맡길 Agent는? | `general-purpose` |
   | worker | 구현을 위임할 Agent는? | 없음 |

3. 역할마다 model·effort를 묻는다. 2에서 `none`이 아닌 역할만. 위임 도구가 model·effort를 받지 않거나 받는지 미확인인 harness는 묻지 않는다.
   - 후보는 위임 도구가 받는 값 그대로. Claude Code는 `Agent` 도구 스키마의 `model`(현재 별칭 `opus`·`sonnet`·`haiku`·`fable`)과 `effort`(현재 `low`·`medium`·`high`·`xhigh`·`max`). 세션 컨텍스트에 별칭이 가리키는 모델이 보이면 옵션 설명에 적는다.
   - 모델별 지원 effort는 따로 확인하지 않는다. 고른 모델이 지원하지 않는 레벨은 지원 레벨 중 그 이하 최고로 실행된다.
   - 첫 옵션은 "Agent 정의대로 (기본)". Claude Code는 문항당 옵션 4개, 호출당 4문항까지다. 옵션에 못 넣은 값은 질문 문장에 적고 "Other"로 받는다. 문항이 넘치면 나눠 묻는다.
4. 기록. `~/.config/dwarf/agents.md`에 현재 harness 블록을 쓴다. `--here`면 작업 루트 `.dwarf/agents.md`에 쓴다. 디렉토리가 없으면 만든다. 다른 harness 블록은 건드리지 않는다. model·effort는 "Agent 정의대로"가 아닌 것만 쓴다.
5. 선택 결과를 답변에 한 줄로 적고 원래 작업을 계속한다.

## 기록 형식

```markdown
# dwarf agents
<!-- /dwarf agents 로 다시 고른다. -->

## claude-code
updated: 2026-10-20
explorer: Explore
explorer.model: haiku
explorer.effort: low
reviewer: general-purpose
worker: none
```

- harness마다 `## <harness>` 블록 하나. 처음 쓰는 harness에서는 그 블록만 추가로 묻는다.
- 값은 Agent 이름 그대로. 없음은 `none`.
- `<역할>.model`·`<역할>.effort`는 선택. 값은 위임 도구가 받는 그대로. 없으면 넘기지 않고 Agent 정의와 세션 설정을 따른다.
