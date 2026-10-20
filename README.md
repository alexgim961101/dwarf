# dwarf

공통 개발 작업용 개인 스킬 묶음. 단일 진입점 `/dwarf`가 작업을 분류해 playbook을 고르고,
이 저장소의 스킬을 순서대로 수행한다. 설계 기준 문서는 [docs/design.md](docs/design.md).

## 사용

| 호출 | 하는 일 |
|---|---|
| `/dwarf <목표>` | 분류 → playbook 단계를 todo에 복사 → 수행 → 보고 |
| `/dwarf 새 작업 <목표>` | 진행 중 playbook을 버리고 재매칭 |
| `/dwarf agents` | 역할(explorer·reviewer·worker)에 붙일 Agent를 다시 고름 |
| `/how`, `/why`, `/blast-radius`, `/bench` | leaf 스킬 단독 호출 |

최초 실행에서 Agent 매핑이 없으면 dwarf가 이 환경의 Agent 후보를 보여 주고 역할마다 고르게 한다. 선택은 `~/.config/dwarf/agents.md`에 dwarf가 기록한다.

## 구조

```
skills/
  dwarf/              # 라우터. SKILL.md, playbooks/, references/
  p-<name>/           # 원칙 12개. 적용할 때만 읽음
  how/  why/          # 동작·구조 파악, 동기·이력 조사
  blast-radius/       # 변경이 diff 밖의 어디를 깨뜨리나
  bench/              # 성능 측정 환경과 교대 측정
tests/routing.md      # 프롬프트 → 기대 playbook
docs/design.md        # 설계 기준
```

playbook 10개. brainstorm, investigation, review, diagnosis, design, bug-fix, feature, refactoring, perf, chore.

## 설치

`skills/` 하위 디렉토리를 각 도구의 `skills/`에 심볼릭 링크한다. 설정 디렉토리가 있는 도구에만 설치하고, 같은 이름이 이미 있으면 덮어쓰지 않는다. 저장소를 옮기면 링크가 깨진다.

```bash
./install.sh --tool claude        # Claude Code에만
./install.sh                      # 감지된 모든 도구 (claude, codex, pi, omp)
./install.sh --tool claude how why  # 일부 스킬만
./install.sh --uninstall          # 이 저장소가 만든 링크 제거
```

| 도구 | 설치 위치 |
|---|---|
| Claude Code | `~/.claude/skills/<스킬명>` |
| Codex | `~/.codex/skills/<스킬명>` |
| Pi | `${PI_CODING_AGENT_DIR:-~/.pi/agent}/skills/<스킬명>` |
| OMP | `~/.omp/agent/skills/<스킬명>` |

설치 뒤 새 세션에서 `/dwarf`가 보인다. Codex·Pi·OMP는 설치만 되고 동작은 아직 확인하지 않았다.
