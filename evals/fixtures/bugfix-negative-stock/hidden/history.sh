#!/usr/bin/env bash
# 커밋 여섯 개. 12일 전 refactor가 재고 저장소를 비동기로 바꾸며 확인과 차감 사이에 틈을 만들었다.
# 9일 전 POS 추가는 같은 결함을 복사한 두 번째 호출부, 2일 전 리포트 수정은 표시만 바꾼 미끼.
set -eu
ws=$1
h=$(cd "$(dirname "$0")" && pwd)/history
tmp=$(mktemp -d)
ago() { date -u -d "$1" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v"$2" '+%Y-%m-%dT%H:%M:%SZ'; }
commit() { GIT_AUTHOR_DATE=$1 GIT_COMMITTER_DATE=$1 git -c user.name=dev -c user.email=dev@example.com commit -q -m "$2"; }
cd "$ws"

# 최종 버전 보관. 아래에서 단계마다 되돌려 놓는다.
mkdir -p "$tmp/final"
cp -R src test scripts data README.md package.json "$tmp/final/"

# 1. 60일 전: 동기 메모리 재고. 가격 조회를 먼저 기다린 뒤 한 동기 구간에서 확인·차감한다.
rm -rf src/pos scripts data test/sales.test.js src/reports/low-stock.js
cp "$h/stock-repo.v1.js" src/inventory/stock-repo.js
cp "$h/reservations.v1.js" src/inventory/reservations.js
cp "$h/restock.v1.js" src/inventory/restock.js
cp "$h/daily.v1.js" src/reports/daily.js
cp "$h/app.v1.js" src/app.js
cp "$h/routes.v1.js" src/http/routes.js
cp "$h/run-local.v1.js" src/dev/run-local.js
cp "$h/logger.v1.js" src/lib/logger.js
cp "$h/package.v1.json" package.json
cp "$h/README.v1.md" README.md
cp "$h/reservations.test.v1.js" test/reservations.test.js
cp "$h/restock.test.v1.js" test/restock.test.js
cp "$h/reports.test.v1.js" test/reports.test.js
git add -A
commit "$(ago '60 days ago' -60d)" "feat: stock reservations, restock, daily report and json api"

# 2. 25일 전: 로그에 시각.
cp "$tmp/final/src/lib/logger.js" src/lib/logger.js
git add -A
commit "$(ago '25 days ago' -25d)" "chore(logger): add timestamp to every line"

# 3. 12일 전: 저장소를 비동기 인터페이스 뒤로. 재고 확인을 가격 조회 앞으로 옮겼다. ← 틈이 생긴 커밋
cp "$tmp/final/src/inventory/stock-repo.js" src/inventory/stock-repo.js
cp "$tmp/final/src/inventory/reservations.js" src/inventory/reservations.js
cp "$tmp/final/src/inventory/restock.js" src/inventory/restock.js
cp "$h/daily.v2.js" src/reports/daily.js
cp "$tmp/final/test/reservations.test.js" test/reservations.test.js
cp "$tmp/final/test/restock.test.js" test/restock.test.js
cp "$h/reports.test.v2.js" test/reports.test.js
cp "$h/README.v2.md" README.md
git add -A
commit "$(ago '12 days ago' -12d)" "refactor(inventory): async stock repository behind an interface; check stock before quoting"

# 4. 9일 전: 매장 POS 판매. 같은 재고를 쓰는 두 번째 호출부.
mkdir -p src/pos
cp "$tmp/final/src/pos/sales.js" src/pos/sales.js
cp "$tmp/final/test/sales.test.js" test/sales.test.js
cp "$h/app.v2.js" src/app.js
cp "$h/routes.v2.js" src/http/routes.js
cp "$h/README.v3.md" README.md
git add -A
commit "$(ago '9 days ago' -9d)" "feat(pos): record walk-in sales and voids against shared stock"

# 5. 5일 전: 새벽 배치용 스냅샷 리포트 CLI.
mkdir -p scripts data/snapshots
cp "$tmp/final/scripts/daily-report.js" scripts/daily-report.js
cp "$tmp/final/data/snapshots/latest.json" data/snapshots/latest.json
cp "$tmp/final/src/dev/run-local.js" src/dev/run-local.js
cp "$tmp/final/package.json" package.json
cp "$tmp/final/README.md" README.md
git add -A
commit "$(ago '5 days ago' -5d)" "feat(reports): snapshot cli for the nightly batch"

# 6. 2일 전: 부족 재고 리포트, 일일 리포트를 이름순·재고 0 포함으로. ← 미끼
cp "$tmp/final/src/reports/low-stock.js" src/reports/low-stock.js
cp "$tmp/final/src/reports/daily.js" src/reports/daily.js
cp "$tmp/final/src/app.js" src/app.js
cp "$tmp/final/src/http/routes.js" src/http/routes.js
cp "$tmp/final/test/reports.test.js" test/reports.test.js
git add -A
commit "$(ago '2 days ago' -2d)" "feat(reports): low stock report; daily report by name with zero-stock items"

rm -rf "$tmp"
