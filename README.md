# dwarf

공통 개발 작업용 개인 스킬 묶음. 단일 진입점 스킬이 작업을 분류해 playbook을 고르고,
[skills](https://github.com/alexgim961101/skills) 저장소의 leaf 스킬을 순서대로 수행한다.

- 의존 방향: dwarf → skills. skills는 dwarf를 모른다.
- 배치 규칙: 단독 호출로 의미가 있으면 skills, playbook 안에서만 의미가 있으면 dwarf.
- 구조와 설치 방법은 스킬이 추가되면서 채운다.
