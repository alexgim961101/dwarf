---
name: dwarf
description: 공통 개발 작업의 단일 진입점. 목표를 받아 playbook을 고르고 단계를 수행한다. 호출은 /dwarf 목표, /dwarf 새 작업 목표, /dwarf agents.
disable-model-invocation: true
---

# dwarf

이 파일이 있는 디렉토리를 `<dwarf>`라 부른다. playbook은 `<dwarf>/playbooks/`, 참조는 `<dwarf>/references/`.

## 시작

1. 인자 해석.
   - `agents` 또는 `agents --here` → `references/agents.md`의 선택 절차를 실행하고 끝낸다. `--here`는 작업 루트 `.dwarf/agents.md`에 기록.
   - `새 작업` 또는 `new task`로 시작 → 진행 중 playbook을 버리고 재매칭한다.
   - 그 외 → 목표. 대화에 진행 중 playbook이 있고 요청이 그 연장이면 계속하고, 아니면 재매칭한다.
2. Claude Code가 아니면 `references/harness.md`에서 현재 도구의 행을 읽는다. 이 문서들은 Claude Code 용어가 기본이다.
3. Agent 매핑을 적용한다. `~/.config/dwarf/agents.md`가 없으면 `references/agents.md` 절차로 묻고 기록한다. 기록된 Agent가 이 세션에 없으면 기본값으로 대체하고 답변에 한 줄 적는다.
4. `references/principles.md`(원칙 색인)를 읽는다. 적용하는 원칙은 `<dwarf>/../p-<이름>/SKILL.md`를 읽는다.

## 분류

```
코드 변경 요청인가?
├─ 아니오. 산출물이
│    ├─ 무엇을 할지 자체가 미정            → brainstorm
│    ├─ 기존 코드에 대한 설명·권고          → investigation
│    ├─ 기존 변경에 대한 판정              → review
│    ├─ 결함의 원인 보고서                 → diagnosis
│    └─ 정해진 요구의 설계·계획 문서        → design
└─ 예. 동작이
     ├─ 결함 수정으로 바뀜                 → bug-fix
     ├─ 새 동작 또는 동작 변경             → feature
     └─ 바뀌지 않음
          ├─ 구조 변경                     → refactoring
          ├─ 느림·자원 과다를 측정으로 고침  → perf
          └─ 의존성·설정·문서·테스트 추가·이름 → chore
```

- "코드는 건들지 마", "~만 해줘"는 변경 없음으로 읽는다. 둘에 걸치면 코드 변경이 있는 쪽.
- 사용자가 playbook이나 단계를 이름으로 지정하면 그 지정이 분류보다 우선한다.
- 어디에도 맞지 않으면 아래 "playbook 없음".

## 재라우팅

- 변경 없는 playbook(brainstorm, investigation, review, diagnosis, design) 도중 코드 변경이 필요해지면 사용자에게 알리고 다음 playbook을 제안한다. 멋대로 넘어가지 않는다.
- diagnosis 뒤 "고쳐"는 bug-fix 2단계부터, design 승인 뒤 "진행"은 feature 4단계부터. 앞 결과를 다시 하지 않는다.
- chore에서 설계 판단이 생기면 feature로, refactoring·perf에서 동작 변경이 필요하면 멈추고 알린다. 지금까지의 변경은 유지한다.

## 실행

1. 위임 여부를 묻는다. 매칭한 playbook과 현재 매핑(`explorer=…, reviewer=…, worker=…`. 기록된 model·effort는 함께)을 보이고 이번 실행에서 서브에이전트를 쓸지 고르게 한다. Claude Code는 `AskUserQuestion`, 다른 도구는 번호 목록. 선택지는 "사용 (매핑대로)"(기본)과 "사용 안 함 (owner가 직접)".
   - 묻지 않는 경우. 요청에 이미 정해져 있다("서브에이전트 없이" 등). 같은 playbook을 이어 간다(앞 선택 유지. playbook이 바뀌면 다시 묻는다). 이번 실행에서 매핑을 막 골랐다. 매핑이 모두 `none`이거나 위임 도구가 없다.
   - "사용 안 함"이면 이번 실행 동안 모든 역할을 `none`으로 본다. 매핑 파일은 바꾸지 않는다.
2. 매칭한 playbook을 열고 단계를 todo에 그대로 복사한다. 맨 위에 위임 선택을 적는다. todo 도구가 없으면 답변에 목록으로 두고 단계마다 갱신한다.
3. 건너뛰는 단계는 지우지 않고 `skip: <이유>`를 붙인다.
4. 각 단계는 owner가 수행한다. 단계가 역할을 지정하면 `references/roles.md`의 위임 여부와 brief 계약대로 위임한다. 결과는 diff와 출력으로 직접 확인한 뒤 자기 말로 요약한다. 위임 결과를 그대로 전달하지 않는다.
5. 완료 전 검증. 검증 명령을 실제로 실행하고 출력을 확인한 뒤에만 완료라고 말한다. 실행하지 못한 검증은 실행하지 못했다고 쓴다.
6. playbook의 보고 항목으로 답한다. leaf를 읽은 원칙 중 결정을 바꾼 것만 이름과 바뀐 결정을 함께 적는다.

## playbook 없음

- todo 첫 줄에 `playbook 없음: <이유>`를 적는다.
- 원칙과 완료 전 검증만 적용해 직접 수행한다.
- 같은 종류의 작업이 두 번 나오면 playbook 추가를 제안한다.

## 자율성

- 되돌릴 수 있는 작업은 묻지 않고 진행하고 결과를 보인다.
- 되돌리기 어려운 작업은 실행 전에 확인한다. 공유 브랜치 force push, 배포, 데이터 삭제, 외부 메시지.
- 커밋·PR은 사용자가 요청했을 때만 한다. playbook은 커밋 준비까지 한다.
- 사용자 지시가 이 파일이나 playbook과 충돌하면 사용자 지시가 우선한다.
- 요청에 동의하지 않으면 그렇게 말한다. 동의가 기본값이 아니다.
