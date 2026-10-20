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

미작성. `skills/` 하위 디렉토리를 각 도구의 `skills/`에 심볼릭 링크하는 스크립트를 둘 예정. 그때까지는 수동으로.

```bash
for d in skills/*/; do ln -s "$(pwd)/$d" ~/.claude/skills/; done
```
