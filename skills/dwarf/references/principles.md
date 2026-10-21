# 원칙 색인

- 원칙 하나는 `skills/p-<이름>/SKILL.md` 하나. 이 색인은 언제 걸리는지만 말하고, 규칙·이유·방법은 leaf에 있다.
- 적용하는 원칙은 leaf를 읽는다. 색인만 보고 적용하지 않는다.
- 답변에는 leaf를 읽은 원칙 중 결정을 바꾼 것만 이름과 바뀐 결정을 함께 적는다. 이름만 적고 바뀐 결정이 없으면 적용한 것이 아니다.
- 사용자는 한국어 이름이나 디렉토리명 어느 쪽으로도 원칙을 지정할 수 있다. "증거로 완료 적용해", "p-prove-it-works".
- 추가 기준: 어떤 playbook 단계에서 같은 판단이 두 번 반복될 때. leaf 스킬에서는 판단 단계 옆에만 붙이고 절차 단계에는 붙이지 않는다.

## 범위

| 원칙 | 언제 | 한 줄 |
|---|---|---|
| [필요한 것만](../../p-necessary-only/SKILL.md) `p-necessary-only` | 기능·설정·추상화·확장 지점을 추가하려 할 때 | 현재 요구에 필요한 것만, 가장 작은 변경 |
| [기존 것 먼저](../../p-reuse-first/SKILL.md) `p-reuse-first` | 새 코드를 쓰기 전 | 같은 책임의 기존 것을 찾아 쓴다. 무관한 것을 묶지 않는다 |
| [구조 존중](../../p-respect-structure/SKILL.md) `p-respect-structure` | 계층·의존 방향·공개 계약을 건드릴 때 | 기존 구조를 따르고, 바꾸면 먼저 설명하고, 경로를 둘 두지 않는다 |
| [범위 안에서 끝까지](../../p-finish-in-scope/SKILL.md) `p-finish-in-scope` | 변경 범위를 정할 때, 끝났다고 말하기 전 | 요구에 한정하되 완결한다. 별도 문제는 분리해 알린다 |

## 설계

| 원칙 | 언제 | 한 줄 |
|---|---|---|
| [데이터 형태 먼저](../../p-model-the-domain/SKILL.md) `p-model-the-domain` | 상태 로직, 분기 증가, 반복되는 형태 가정 | 로직 전에 형태를 정하고 조건문 대신 구조에 담는다 |
| [원인까지](../../p-fix-root-causes/SKILL.md) `p-fix-root-causes` | 결함을 고칠 때 | 처음 잘못된 지점을 고친다. 방어 코드는 정당한 상태에만 |

## 검증

| 원칙 | 언제 | 한 줄 |
|---|---|---|
| [증거로 완료](../../p-prove-it-works/SKILL.md) `p-prove-it-works` | 완료라고 말하기 전, 위임 결과를 받았을 때 | 검증 명령을 실행하고 출력을 본 뒤에만 완료. 한 것과 못 한 것을 구분 |
| [작은 단위로 검증](../../p-verifiable-units/SKILL.md) `p-verifiable-units` | 여러 단계 작업을 나눌 때, 커밋 순서를 정할 때 | 단위마다 검증으로 끝내고 하나씩 확인한다 |
| [동작을 테스트](../../p-test-behavior/SKILL.md) `p-test-behavior` | 테스트를 쓰거나 바꿀 때, 리팩터링 안전망 | 관찰 가능한 동작을 단언한다. 구현은 단언하지 않는다 |
| [숫자를 설명하라](../../p-explain-the-number/SKILL.md) `p-explain-the-number` | 성능 숫자를 보고하기 전 | limiter를 지목하고 다른 것을 측정한 가능성을 배제한다. 횟수·범위를 숫자 옆에 |

## 진행

| 원칙 | 언제 | 한 줄 |
|---|---|---|
| [컨텍스트 보호](../../p-guard-context/SKILL.md) `p-guard-context` | 긴 파일·큰 출력·넓은 탐색 | 대량 읽기는 explorer에게, 메인에는 포인터와 요약만 |
| [묻기 전에 해 보기](../../p-act-before-asking/SKILL.md) `p-act-before-asking` | 사용자에게 물으려 할 때 | 실행해서 알 수 있으면 실행한다. 취향·되돌리기 어려운 일만 묻는다 |
| [요약 먼저](../../p-summary-first/SKILL.md) `p-summary-first` | 최종 답변·보고·문서를 쓰기 전 | 핵심은 빠뜨리지 않고 설명은 짧게. 더 깊은 설명은 질문을 받아서 |
