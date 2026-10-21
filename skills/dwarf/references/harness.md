# harness 매핑

dwarf 문서는 Claude Code 용어로 쓴다. 다른 도구에서는 이 표로 바꿔 읽는다. 행이 없으면 가장 가까운 기능을 쓰고 답변에 적는다. "미확인"은 해당 도구에서 아직 검증하지 않은 값.

## 감지

| 세션에 보이는 것 | harness |
|---|---|
| `Agent`, `AskUserQuestion`, `Skill` 도구 | claude-code |
| `~/.codex/` 설정, Codex CLI | codex |
| `/skill:<name>` 호출, `~/.pi/agent/` | pi |
| `/skill:<name>` 호출, `~/.omp/agent/` | omp |

## 기능

| 기능 | claude-code | codex | pi | omp |
|---|---|---|---|---|
| 서브에이전트 | `Agent(subagent_type, prompt)`. 백그라운드가 기본 | 미확인 | 미확인 | agent 이름으로 호출. 미확인 |
| 위임 model·effort | `Agent`의 `model`(별칭)·`effort` | 미확인 | 미확인 | 미확인 |
| 읽기 전용 위임 | `Explore`. Bash는 남으므로 brief에 "수정하지 않는다"를 쓰고 사후 `git status` | 미확인 | 미확인 | 미확인 |
| 사용자 질문 | `AskUserQuestion`. 비대화형(`-p`)이면 답변 본문에 | 답변 본문 | 답변 본문 | 답변 본문 |
| todo | `TodoWrite`가 있으면 사용. 없으면 답변에 목록 | 답변에 목록 | 답변에 목록 | 답변에 목록 |
| 다른 dwarf 스킬 실행 | `<dwarf>/../<name>/SKILL.md`를 Read 하고 따른다. `Skill` 도구는 `disable-model-invocation` 스킬을 거부 | 같음 | 같음 | 같음 |
| 사용자에게 안내할 호출 표기 | `/dwarf` | `/dwarf` | `/skill:dwarf` | `/skill:dwarf` |
| 스킬 설치 경로 | `~/.claude/skills/` | `~/.codex/skills/` | `${PI_CODING_AGENT_DIR:-~/.pi/agent}/skills/` | `~/.omp/agent/skills/` |
| Agent 매핑 파일 | `~/.config/dwarf/agents.md` | 같음 | 같음 | 같음 |
| MCP 출처 탐지 (why) | 세션에 보이는 `mcp__<server>__*` 도구 이름 | 미확인 | 미확인 | 미확인 |

## Claude Code 메모

- `Agent`의 `model`은 별칭만 받는다. 별칭은 버전을 고정하지 않고 제공자 매핑에 따라 해석된다. 버전 고정은 Agent 정의 frontmatter의 `model`에 전체 ID로 한다.
- dwarf는 `agents.md`에 기록된 `model`·`effort`만 넘긴다. 기록이 없으면 Agent 정의 frontmatter와 세션 설정이 정한다.
- 넘긴 값을 덮는 것. `CLAUDE_CODE_EFFORT_LEVEL`은 `effort`를, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`과 mod의 `agent.spawn` 훅은 `model`을 덮는다.
- 서브에이전트는 사용자에게 질문할 수 없다. 질문이 필요한 단계는 owner가 맡는다.
- `disable-model-invocation: true` 스킬은 `/` 메뉴에만 보이고 모델에게는 설명이 노출되지 않는다. dwarf가 다른 스킬을 쓸 때는 이름을 알고 경로로 읽는다.
