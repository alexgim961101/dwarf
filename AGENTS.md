# AGENTS.md

이 저장소에서 작업하는 에이전트용 지침. 사용법·설치는 [README.md](README.md), 설계 근거는 [docs/design.md](docs/design.md).

## 개요

- 공통 개발 작업용 개인 스킬 묶음. pstack `poteto-mode`의 라우터·playbook 구조에서 영감을 받았다.
- `/dwarf <목표>` 하나로 시작한다. 라우터가 작업을 분류해 playbook을 고르고, playbook 단계와 leaf 스킬을 순서대로 수행한다.
- 산출물은 Markdown 스킬 문서다. 실행 코드는 `install.sh` 하나.
- 문서는 Claude Code 용어로 쓴다. Codex·Pi·OMP와의 차이는 `skills/dwarf/references/harness.md`에만 둔다.

## 프로젝트 구조

| 경로 | 역할 |
|---|---|
| `skills/dwarf/SKILL.md` | 라우터. 인자 해석, 분류 트리, 재라우팅, 실행 규칙 |
| `skills/dwarf/playbooks/` | 작업 유형별 단계 10개. brainstorm, investigation, review, diagnosis, design, bug-fix, feature, refactoring, perf, chore |
| `skills/dwarf/references/` | 공유 참조. `roles`(역할·brief), `agents`(Agent 선택·기록), `harness`(도구별 매핑), `principles`(원칙 색인) |
| `skills/p-<name>/` | 원칙 leaf 13개. 적용할 때만 읽음 |
| `skills/how/`, `skills/why/` | leaf. 동작·구조 파악 / 동기·이력 조사 |
| `skills/blast-radius/` | leaf. 변경이 diff 밖의 어디를 깨뜨리나 |
| `skills/bench/` | leaf. 성능 측정 환경. `templates/`에 compose·k6 |
| `skills/root-cause/`, `skills/blueprint/`, `skills/inspect/` | leaf. 결함 원인 확정 / 설계·작업 단위 / 변경 점검·판정 |
| `tests/routing.md` | 프롬프트 → 기대 playbook 케이스 |
| `docs/design.md` | 설계 기준. 결정·미결·하지 않는 것 |
| `install.sh` | `skills/*/`를 각 도구의 skills 디렉토리에 심볼릭 링크 |
| `.docs/` | 로컬 작업 문서. gitignore |

```
라우터 ──▶ playbook ──▶ leaf 스킬 (p-*, how, why, blast-radius, bench, root-cause, blueprint, inspect)
   └──────────┴─────────────┴──▶ references/  (모든 층이 읽기만 함)
```

- 참조는 위에서 아래로만. leaf는 playbook·라우터를 모른다.
- playbook은 다른 playbook을 포함하지 않는다. 둘 이상에서 반복되는 절차는 leaf로 내리고 playbook은 leaf를 순서대로 부른다.
- 다른 스킬은 `Skill` 도구가 아니라 경로(`<dwarf>/../<name>/SKILL.md`)로 읽는다. `skills/` 아래 형제 배치를 유지한다.

## 작성 규칙

- 파일명 영문 kebab-case, 본문 한국어 개조식.
- 모든 `SKILL.md` frontmatter는 `name`(디렉토리명과 같음), `description`, `disable-model-invocation: true`. 자동 트리거 없음.
- `description`에 `<`, `>`를 쓰지 않는다. Claude Code `/` 메뉴에서 HTML 엔티티로 깨진다.
- 줄 상한. 라우터 `SKILL.md` 80줄, 원칙 leaf 25줄.
- 형식.
  - 원칙 leaf: 언제 / 규칙 / 왜 / 방법 / 아닌 것.
  - playbook: 소유 선언, 번호 단계, `**보고:**`.
- playbook·leaf는 역할 이름(explorer·reviewer·worker)만 쓴다. Agent 이름·모델을 쓰지 않는다.
- 모든 단계는 역할 매핑이 "없음"이어도 owner가 직접 수행할 수 있게 쓴다.
- `p-<name>`은 판단 단계 옆에만 붙이고 절차 단계에는 붙이지 않는다.
- playbook·leaf·원칙은 같은 필요가 두 번 보일 때만 추가한다. 후보와 미룬 이유는 `docs/design.md`에 있다.
- 책임 분담. playbook은 순서·멈춤·사용자 보고·재라우팅, leaf는 절차와 출력. leaf에 멈춤·보고 항목·다음 playbook을 쓰지 않는다.
- leaf 분리는 셋 다 맞을 때만.
  - 두 개 이상 playbook에서 같은 내용으로 반복된다. 유형별 변형이 대부분이면 playbook에 남긴다.
  - 여러 줄의 절차다. 한 줄짜리는 playbook이나 원칙에 둔다.
  - playbook 없이도 입력·출력이 성립한다.
  - 예외. 템플릿·스크립트를 동반하는 절차는 한 playbook만 써도 leaf.
- pstack은 구조만 참고한다. 문구·코드는 가져오지 않고 새로 쓴다.

## 변경 시 함께 갱신

| 변경 | 함께 갱신 |
|---|---|
| 스킬 추가·삭제·이름 변경 | `README.md` 구조, `docs/design.md` 디렉토리, `install.sh` 재실행 |
| playbook 추가·삭제 | 라우터 분류 트리, `docs/design.md` playbook 표, `README.md` 목록, `tests/routing.md` 케이스 |
| 원칙 추가·삭제 | `references/principles.md` 색인, `docs/design.md` 원칙 절 |
| 분류 트리 변경 | `tests/routing.md` 재실행 |
| 역할·brief 변경 | `references/roles.md`, 그 역할을 쓰는 playbook·leaf |
| 설계 결정 변경 | `docs/design.md` 해당 절과 미결 표 |
| playbook·leaf 책임 분담, leaf 분리 기준 | `AGENTS.md` 작성 규칙, `docs/design.md` leaf 스킬 절 |

## 테스트 방법

자동화된 테스트는 없다. 변경 종류에 맞는 항목을 실행하고 출력을 확인한다.

| 대상 | 방법 |
|---|---|
| 라우팅 | `tests/routing.md`의 실행 방법대로. 서브에이전트에 "분류" 절과 프롬프트만 주고 playbook 이름을 받아 기대값과 비교 |
| frontmatter·줄 상한 | 아래 정적 확인 |
| `install.sh` | `bash -n install.sh`, 격리 HOME에서 설치·재실행·제거 |
| 스킬 노출 | 설치 후 새 세션의 `/` 메뉴에 보이는지, description이 깨지지 않는지 |

```bash
# 정적 확인: name = 디렉토리명, disable-model-invocation, description의 < >
for f in skills/*/SKILL.md; do d=$(basename "$(dirname "$f")"); grep -q "^name: $d$" "$f" && grep -q "^disable-model-invocation: true" "$f" || echo "FAIL $f"; done
grep -H '^description:.*[<>]' skills/*/SKILL.md
wc -l skills/dwarf/SKILL.md skills/p-*/SKILL.md

# install.sh 격리 확인. 실사용 ~/.claude 를 건드리지 않는다
T=$(mktemp -d) && mkdir "$T/.claude"
HOME="$T" ./install.sh --tool claude               # 설치
HOME="$T" ./install.sh --tool claude               # 멱등: "이미 설치됨"
HOME="$T" ./install.sh --tool claude --uninstall   # 제거
```

- Codex·Pi·OMP는 설치만 되고 동작은 미확인이다. 확인하지 않은 harness를 확인했다고 보고하지 않는다.

## 주의사항

- 설치가 심볼릭 링크다. 저장소 수정이 `~/.claude/skills/` 등 실사용 환경에 바로 반영되고, 작업 중인 미완성 문서도 다른 세션의 `/dwarf`가 읽는다.
- 새 스킬은 `install.sh`를 다시 실행해야 링크된다. 저장소를 옮기면 링크가 깨진다.
- `docs/design.md`의 미결 항목은 임시 기본값을 따른다. 바꾸려면 먼저 사용자와 정한다.
- 커밋은 사용자가 요청할 때만. 메시지는 `feat:`·`fix:`·`chore:` 접두사와 개조식 본문. 요청하지 않은 트레일러는 붙이지 않는다.
