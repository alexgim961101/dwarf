# 관문 기록

변경 playbook이 작업 트리를 바꿔도 되는지 남기는 기록. Claude Code에서는 `/dwarf`를 부를 때 등록되는 hook(`hooks/gate.py`)이 이 기록 없이 작업 트리를 바꾸지 못하게 막는다. 같은 hook이 playbook을 열기 전의 작업, root-cause를 읽기 전의 bug-fix 관문 기록, inspect 점검 없이 끝내기도 막는다.

## 파일

- `<작업 디렉토리>/.docs/dwarf/gate`. 작업 디렉토리는 세션을 시작한 디렉토리다.
- Write 또는 Edit 도구로 쓴다. Bash로 쓴 기록은 hook이 받아들이지 않는다. 세션의 관문 상태가 바뀌지 않아 승인 뒤에도 `approved`를 쓸 수 없다. Bash로 쓰면 hook이 그 호출 뒤에 알린다.
- `answered`는 hook이 파일을 고쳐 쓴 것이다. 그 뒤에 쓸 때는 먼저 Read한다. 읽지 않고 쓰면 도구가 거절해 호출이 하나 버려진다.
- 형식은 세 줄.

```
status: pending
playbook: bug-fix
reason: 해결안 후보 비교를 보고하고 승인을 기다린다
```

## status

| status | 누가 쓰나 | 작업 트리 수정 | 뜻 |
|---|---|---|---|
| pending | 모델 | 막힘 | 진단과 격리된 시험은 계속한다. 관문 보고를 하면 이번 턴을 끝낸다 |
| answered | hook | 막힘 | 사용자가 관문 보고에 답했다. 다음 사용자 메시지에서 hook이 바꾼다 |
| approved | 모델, answered 뒤에만 | 열림 | 사용자가 승인했다 |
| none | 모델, 이유 필수 | 열림 | 관문 대상이 아니다. bug-fix·incident에는 쓸 수 없다 |

## playbook별

| playbook | 처음 쓸 때 |
|---|---|
| bug-fix | 1단계 시작에 `../root-cause/SKILL.md`를 읽고 `pending`. 관문 1에서 사용자가 해결안을 고르면 `approved` |
| incident | 1단계 시작에 `pending`. 관문 1에서 사용자가 조치 조합을 고르면 `approved` |
| feature | 3단계 관문 판정 결과. 관문 대상이면 `pending`, 아니면 `none`과 이유. 관문 1에서 승인되면 `approved` |
| refactoring, perf, chore | 작업 트리를 처음 바꾸기 전에 `none`과 이유 |
| 없음 (맞는 playbook이 없음) | 다른 작업 전에 `none`, `playbook: 없음`과 이유 |
| investigation, review, brainstorm | 쓰지 않는다. 작업 트리를 바꾸지 않는다 |

## 막는 것과 막지 않는 것

- 막는 것: 작업 트리(세션을 시작한 저장소의 worktree) 안 파일을 Edit·Write·NotebookEdit로 바꾸기.
- playbook을 열기 전에 막는 것: dwarf 문서·설정을 읽지 않는 Bash, 모든 Edit·Write·NotebookEdit, 관문 기록. Read·Grep은 막지 않는다. playbook 파일을 Read나 Bash로 읽으면 열린 것으로 본다. 예외는 `playbook: 없음` 관문 기록과 Agent 매핑 파일(`~/.config/dwarf/agents.md`, `.dwarf/agents.md`) 쓰기. `/dwarf agents`는 playbook 없이 이것만 한다.
- root-cause를 읽기 전에 막는 것: bug-fix의 `pending` 기록. 1단계를 `root-cause` 절차로 하게 한다. 읽지 않고 직접 조사하는 실행이 많았다(`docs/progress.md` 10·13절). `../root-cause/SKILL.md`를 Read나 Bash로 읽으면 읽은 것으로 본다.
- 되돌려 보내는 것: inspect(`../inspect/SKILL.md`)를 읽지 않고 끝내기. 관문 보고 전(`pending`)의 feature·incident, 작업 트리를 바꾸거나 커밋한 뒤(`approved`·`none`)의 bug-fix·incident·feature·refactoring·perf. 한 번만 되돌려 보낸다. 그 단계까지 가지 않았으면 이유를 보고에 넣어 다시 끝낸다.
- 알리는 것: 관문이 열리기 전에 Bash로 작업 트리를 바꾸면 그 Bash 호출 뒤에 되돌리라고 알린다.
- 막지 못하는 것: 실행 중인 대상의 상태를 바꾸는 명령(배포·재시작·reload). incident는 playbook 규칙으로 관문 1 전에 실행하지 않는다.
- playbook을 연 뒤 막지 않는 것: `.docs/` 아래, 작업 트리 밖 경로, 별도 worktree. 해결안 시험과 원인 조사용 계측은 별도 worktree에서 한다.
- 기록은 세션마다 따로 본다. 다른 세션이 남긴 `gate` 파일은 믿지 않는다.

## 한계

- hook은 Claude Code에서 `/dwarf`를 부른 세션에만 걸린다. `claude -p --resume`으로 이어 간 실행에는 다시 걸리지 않는다. 라우터 frontmatter의 hooks를 `--settings`로 넘기면 걸리고 세션 상태도 이어진다(Claude Code 2.1.319에서 확인. `evals/run.sh`가 이렇게 한다). 무인 실행은 첫 실행에서 관문 보고까지 하고, 승인 뒤 이어 가는 실행에서 고친다.
- 다른 harness에는 hook이 없다. 기록 규칙만 따른다.
- 필요: `python3`, `git`.
