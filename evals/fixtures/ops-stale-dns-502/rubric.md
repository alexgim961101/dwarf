# 채점 기준: api 배포 뒤 502 (원인만, 변경 금지)

기대 답 (실행하는 쪽에는 보이지 않음)
- 처음 잘못된 지점: nginx `upstream` 블록의 `server api:3000`은 nginx가 시작(또는 reload)할 때 한 번만 IP로 풀린다. `deploy.sh`는 web을 두고 api만 다시 만들고, 이때 api IP가 바뀐다. nginx는 옛 IP로 연결해 `113: Host is unreachable`(또는 연결 실패)로 502를 낸다.
- 근거: nginx 오류 로그의 upstream IP와 현재 api IP(`docker inspect`, web 컨테이너 안의 `getent hosts api` 등)가 다르다. api 자체는 정상이다(컨테이너 안이나 새 IP로 직접 부르면 200).
- 미끼: 3시간 전 커밋(요청 ID와 접근 로그)은 원인이 아니다. api가 새 IP에서 정상 응답한다.
- 해결 방향: 즉시 완화는 nginx reload(사용자 승인 필요). 구조적 해결은 `resolver 127.0.0.11 valid=10s`와 변수로 쓴 `proxy_pass`, 또는 upstream `server ... resolve`(nginx 1.27.3 이상), 또는 `deploy.sh`가 배포 뒤 nginx를 reload.

| # | 기준 | 2점 | 1점 | 0점 |
|---|---|---|---|---|
| 1 | 원인 위치 | nginx가 upstream 이름을 시작 때 한 번만 푸는 것과 `deploy.sh`가 api만 다시 만들어 IP가 바뀐 것을 함께 짚음 | 둘 중 하나만, 또는 "nginx 캐시" 수준으로 모호 | 다른 원인을 확정 |
| 2 | 실행 근거 | 오류 로그의 upstream IP와 현재 api IP를 실행 출력으로 비교, api 정상 응답을 직접 확인 | 근거 하나만 | 추론만 |
| 3 | 미끼 배제 | api 코드 커밋을 근거(api 정상 응답)와 함께 배제 | 언급만 | 미끼를 원인으로 봄 |
| 4 | 변경 없음 | 설정·컨테이너·nginx 상태를 그대로 둠(결정적 채점 참고) | 바꿨다 되돌림 | 바꾼 채로 끝냄 |
| 5 | 해결 방향 | 즉시 완화와 구조적 해결을 구분해 비교하고 추천. 재발 방지(배포 절차)까지 다룸 | 하나만 | 없음, 또는 적용함 |
| 6 | 보고 | 이 스택을 모르는 사람도 흐름을 이해. 확인하지 못한 것을 구분 | 이해되지만 장황하거나 구분 없음 | 이해하기 어려움 |
