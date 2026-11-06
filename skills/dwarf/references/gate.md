# 관문 기록

변경 playbook이 작업 트리를 바꿔도 되는지 남기는 기록. Claude Code에서는 `/dwarf`를 부를 때 등록되는 hook(`hooks/gate.py`)이 이 기록 없이 작업 트리를 바꾸지 못하게 막는다.

## 파일

- `<작업 디렉토리>/.docs/dwarf/gate`. 작업 디렉토리는 세션을 시작한 디렉토리다.
- Write 또는 Edit 도구로 쓴다. Bash로 쓴 기록은 hook이 받아들이지 않는다.
- 형식은 세 줄.

```
status: pending
playbook: bug-fix
reason: 해결안 후보 비교를 보고하고 승인을 기다린다
```

## status

| status | 누가 쓰나 | 작업 트리 수정 | 뜻 |
|---|---|---|---|
| pending | 모델 | 막힘 | 관문 보고를 하고 이번 턴을 끝낸다 |
| answered | hook | 막힘 | 사용자가 관문 보고에 답했다. 다음 사용자 메시지에서 hook이 바꾼다 |
| approved | 모델, answered 뒤에만 | 열림 | 사용자가 승인했다 |
| none | 모델, 이유 필수 | 열림 | 관문 대상이 아니다. bug-fix에는 쓸 수 없다 |

## playbook별

| playbook | 처음 쓸 때 |
|---|---|
| bug-fix | 1단계 시작에 `pending`. 관문 1에서 사용자가 해결안을 고르면 `approved` |
| feature | 3단계 관문 판정 결과. 관문 대상이면 `pending`, 아니면 `none`과 이유. 관문 1에서 승인되면 `approved` |
| refactoring, perf, chore | 작업 트리를 처음 바꾸기 전에 `none`과 이유 |
| investigation, review, brainstorm | 쓰지 않는다. 작업 트리를 바꾸지 않는다 |

## 막는 것과 막지 않는 것

- 막는 것: 작업 트리(세션을 시작한 저장소의 worktree) 안 파일을 Edit·Write·NotebookEdit로 바꾸기.
- 알리는 것: 관문이 열리기 전에 Bash로 작업 트리를 바꾸면 그 Bash 호출 뒤에 되돌리라고 알린다.
- 막지 않는 것: `.docs/` 아래, 작업 트리 밖 경로, 별도 worktree. 해결안 시험과 원인 조사용 계측은 별도 worktree에서 한다.
- 기록은 세션마다 따로 본다. 다른 세션이 남긴 `gate` 파일은 믿지 않는다.

## 한계

- hook은 Claude Code에서 `/dwarf`를 부른 세션에만 걸린다. `claude -p --resume`으로 이어 간 실행에는 다시 걸리지 않는다(Claude Code 2.1.318에서 확인). 무인 실행은 첫 실행에서 관문 보고까지 하고, 승인 뒤 이어 가는 실행에서 고친다.
- 다른 harness에는 hook이 없다. 기록 규칙만 따른다.
- 필요: `python3`, `git`.
