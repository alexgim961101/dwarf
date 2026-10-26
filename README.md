# dwarf

공통 개발 작업용 개인 스킬 묶음. 단일 진입점 `/dwarf`가 작업을 분류해 playbook을 고르고,
이 저장소의 스킬을 순서대로 수행한다. 설계 기준 문서는 [docs/design.md](docs/design.md).

## 사용

| 호출 | 하는 일 |
|---|---|
| `/dwarf <목표>` | 분류 → 서브에이전트 사용 여부 선택 → playbook 단계를 todo에 복사 → 수행 → 보고 → 실행이 만든 자원 정리 |
| `/dwarf 새 작업 <목표>` | 진행 중 playbook을 버리고 재매칭 |
| `/dwarf agents` | 역할(explorer·reviewer·worker)에 붙일 Agent와 model·effort를 다시 고름 |
| `/how`, `/why`, `/blast-radius`, `/bench`, `/root-cause`, `/blueprint`, `/inspect` | leaf 스킬 단독 호출 |

최초 실행에서 Agent 매핑이 없으면 dwarf가 이 환경의 Agent 후보를 보여 주고 역할마다 Agent와 model·effort(선택)를 고르게 한다. 선택은 `~/.config/dwarf/agents.md`에 dwarf가 기록한다.

## 구조

```
skills/
  dwarf/              # 라우터. SKILL.md, playbooks/, references/
  p-<name>/           # 원칙 14개. 적용할 때만 읽음
  how/  why/          # 동작·구조 파악, 동기·이력 조사
  blast-radius/       # 변경이 diff 밖의 어디를 깨뜨리나
  bench/              # 성능 측정 환경과 교대 측정
  root-cause/         # 재현과 가설 소거로 결함의 메커니즘 확정
  blueprint/          # 데이터 형태·대안 비교·하위 기능·작업 단위
  inspect/            # 변경·설계 문서를 의도와 대조해 발견 사항과 판정
tests/routing.md      # 프롬프트 → 기대 playbook
docs/design.md        # 설계 기준
```

playbook 8개. brainstorm, investigation, review, bug-fix, feature, refactoring, perf, chore. 원인만·설계만 같은 요청은 해당 playbook을 구현 전에 멈춰 수행한다. 큰 기능이나 설계 요청은 하위 기능 목록을 담은 스펙을 `.docs/feature/`에 문서로 쓰고 독립 검토와 사용자 승인을 거친 뒤, 하위 기능 하나를 커밋 하나로 구현한다. 오래 걸리는 성능 측정은 설계를 `.docs/perf/`에 쓰고 독립 검토·파일럿·사용자 승인을 거쳐 측정한다.

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
