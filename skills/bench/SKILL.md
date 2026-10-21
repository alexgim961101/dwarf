---
name: bench
description: 성능 측정 환경을 docker compose로 세우고, 변경 전·후를 같은 조건에서 번갈아 N회 측정해 아티팩트를 남긴다. 서비스 모드(부하 → 지연·처리량)와 작업 모드(입력 → 완료 시간·메모리).
disable-model-invocation: true
---

# bench

같은 조건에서 두 번 측정할 수 있는 환경을 만들고, 숫자와 함께 그 숫자를 다시 만들 명령을 남긴다. 숫자의 해석은 `p-explain-the-number`.

## 계약

| 항목 | 기본 | 비고 |
|---|---|---|
| 모드 | 서비스 모드: 부하 → p50·p95 지연, 처리량, 오류율. 작업 모드: 입력 데이터셋 → 완료 시간, 최대 메모리, 처리 건수 | HTTP API는 서비스, 배치·분석 작업은 작업 모드 |
| 대상 | 프로젝트의 compose 서비스. 기준선과 사후는 코드만 다르고 이미지 베이스·설정·데이터셋·환경변수는 같음 | 한쪽만 기본 설정이면 구현이 아니라 설정을 비교한 것 |
| 부하 생성기 | 서비스 모드 `grafana/k6` 스크립트 하나, `--summary-export`로 JSON. 작업 모드는 실행 명령과 `/usr/bin/time -v` | k6가 먼저 포화되면 측정한 것은 k6. 부하기 CPU도 기록 |
| 자원 계측 | `docker stats --no-stream --format` 1초 샘플링 → CSV | Prometheus·cAdvisor·Grafana는 시계열 그래프가 필요해질 때 추가 |
| 프로파일 | 언어별. Go `pprof`, Node `--cpu-prof`, Python `py-spy` | 보고하지 않는 run에서만. 프로파일러가 느리게 만듦 |
| 반복 | 기준선·사후 번갈아 5회(A B A B …). 중앙값과 범위 | 변동 폭보다 작은 차이는 차이 없음 |
| 환경 기록 | `nproc`, `uptime`의 부하, 이미지 digest, 데이터셋 크기, 날짜 | 머신이 바쁘면 번갈아 돌려 양쪽이 같은 노이즈를 보게 함 |
| 아티팩트 | `<프로젝트>/.docs/perf/<날짜>-<주제>/{baseline,after}/` | summary JSON, stats CSV, 프로파일, 환경 기록, 재실행 명령 |
| 한계 | 로컬 docker 숫자는 상대 비교. 절대값은 운영 환경이 아님 | 보고에 명시 |

## 절차

1. 지표와 모드를 정한다. 지표 하나, 데이터셋 크기, 목표치. 이미 정해져 넘어왔으면 그대로 쓴다.
2. 측정 환경을 준비한다. 프로젝트에 `.docs/perf/compose.yml`이 없으면 `templates/docker-compose.perf.yml`을 복사해 앱 서비스를 채운다. 서비스 모드면 `templates/k6.js`를 복사해 경로와 임계값을 채운다. 작업 모드면 실행 명령과 입력 경로를 적는다. 데이터셋은 고정 파일로 두고 크기를 기록한다.
3. 환경을 기록한다.
   ```bash
   { date -Iseconds; nproc; uptime; docker compose -f .docs/perf/compose.yml images --format json; } > .docs/perf/<run>/env.txt
   ```
4. 한 라운드를 돈다. 기준선 코드로 띄우고 측정하고 내리고, 사후 코드로 같은 순서. 이것을 5회 번갈아 반복한다. 한 라운드의 서비스 모드 명령.
   ```bash
   docker compose -f .docs/perf/compose.yml up -d app
   docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' app >> .docs/perf/<run>/stats.csv &  # 1초 루프로 감싼다
   docker compose -f .docs/perf/compose.yml run --rm k6 run --summary-export /out/summary.json /scripts/k6.js
   docker compose -f .docs/perf/compose.yml down
   ```
   작업 모드는 k6 대신 `docker compose run --rm app <명령>`을 `/usr/bin/time -v`로 감싸 완료 시간과 최대 RSS를 받는다.
5. 보고하지 않는 run을 하나 더 돌려 프로파일을 받고 핫스팟을 소스에 대응시킨다. limiter를 지목한다.
6. 결과를 모은다. 라운드마다 지표값을 표로, 중앙값과 범위, 오류 수, 처리 건수. 재실행 명령을 `README.md`에 적어 아티팩트 디렉토리에 둔다.

## 보고

지표와 데이터셋, 기준선 → 사후(중앙값, 범위, 횟수), 오류 수와 처리 건수, limiter, 아티팩트 경로, 재실행 명령 한 줄. 결론은 `p-explain-the-number`의 넷 중 하나.
