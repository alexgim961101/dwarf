# 소스 관리 (git, gh, 저장소 안 문서)

항상 조사하는 출처. 코드와 직접 묶여 있고 가장 완전하다. 저장소를 거친 것은 전부 여기 있다.

## 무엇이 있나

- 커밋 이력. 메시지, 날짜, 작성자, diff.
- PR 본문, 리뷰 댓글, 토론 스레드. `gh`로 읽는다.
- 코드 주석, TODO, FIXME, deprecation 표시.
- ADR(아키텍처 결정 기록). 저장소가 두고 있다면.
- 테스트. 이름과 단언문이 변경을 부른 엣지 케이스를 담는 경우가 많다.
- 같은 커밋에서 함께 바뀐 파일. 함께 바뀌는 것은 함께 설계된 것이다.
- CHANGELOG, 릴리스 노트.
- 커밋 메시지·PR 본문의 이슈 키. 다른 출처로 가는 단서.

## 어떻게 찾나

앵커의 커밋 목록을 넓힌다.

```bash
git log --follow --oneline -30 -- <file>          # 이름 변경을 넘어선 이력
git log -S '<코드의 정확한 문자열>' -- <file>        # 이 문자열을 넣거나 뺀 커밋
git log -G '<정규식>' -- <file>                     # 패턴이 바뀐 커밋
git blame -L <start>,<end> <file>                  # 줄마다 누가 언제
git show <hash>                                    # 커밋 하나의 전체 diff와 메시지
git log <old>..<new> -p -- <file>                  # 두 시점 사이 변경
git log -1 --format=%B <hash>                      # 본문에서 PR 번호·이슈 키 추출
```

PR을 읽는다. 머지 커밋 제목의 `(#1234)`가 PR 번호. 원격이 GitHub가 아니면(`git remote get-url origin`으로 확인) `gh`를 쓰지 않고 머지 커밋 메시지와 이슈 키로 대신한다. Bitbucket·GitLab MCP 도구가 세션에 보이면 그것으로 PR 본문을 읽는다.

```bash
gh pr view <n> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews
gh pr list --search '<키워드>' --state all --limit 20
```

저장소 안 문서를 찾는다.

```bash
rg -l -i 'decision|ADR|RFC' --glob '*.md'
rg -n -C2 '(TODO|FIXME|HACK|XXX|NOTE)' <target_file>
rg -l '<symbol>' --glob '*test*'
rg -n '<symbol>' CHANGELOG* docs/ 2>/dev/null
```

## 좋은 증거

- 커밋 메시지 본문이나 PR 본문의 "왜" 문장. 원문 그대로.
- 리뷰 댓글에서 대안을 두고 고른 기록. "A는 X 때문에 안 되고 B로 간다."
- 변경과 같은 커밋에 들어온 테스트의 이름. 어떤 경우를 막으려 했는지.
- 주석에 적힌 이유와 그 주석을 넣은 커밋.

## 함정

- squash 머지는 커밋 단위 메시지를 지운다. PR 본문과 리뷰가 유일한 기록일 수 있다.
- rebase는 날짜를 바꾼다. 시점 추론은 머지 날짜나 PR 날짜로 한다.
- 메시지 템플릿의 보일러플레이트("코드 개선")는 이유가 아니다.
- 이슈 키만 있고 본문이 없으면 이슈 트래커 출처의 단서로 넘긴다. 여기서 추측하지 않는다.
- 되돌려진 커밋(revert)은 그 자체가 증거다. 되돌린 이유를 찾는다.

## 반환

항목마다 커밋 해시 또는 PR 번호, 날짜, 작성자, 원문 인용, 질문과의 관계. 함께 바뀐 파일 목록. 발견한 이슈 키는 "다른 출처 단서"로.
