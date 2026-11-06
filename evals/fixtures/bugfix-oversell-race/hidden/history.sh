#!/usr/bin/env bash
# 커밋 세 개. 가격 조회를 원격 호출(await)로 바꾼 커밋이 확인과 차감 사이에 틈을 만들었다.
set -eu
ws=$1
h=$(cd "$(dirname "$0")" && pwd)/history
tmp=$(mktemp -d)
ago() { date -u -d "$1" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v"$2" '+%Y-%m-%dT%H:%M:%SZ'; }
commit() { GIT_AUTHOR_DATE=$1 GIT_COMMITTER_DATE=$1 git -c user.name=dev -c user.email=dev@example.com commit -q -m "$2"; }
cd "$ws"
cp src/inventory/reservations.js src/pricing/client.js src/dev/fakes.js README.md "$tmp/"
cp "$h/reservations.v1.js" src/inventory/reservations.js
cp "$h/pricing-client.v1.js" src/pricing/client.js
cp "$h/fakes.v1.js" src/dev/fakes.js
grep -v 'fakes.js' "$tmp/README.md" > README.md
git add -A
commit "$(ago '40 days ago' -40d)" "feat: stock reservations with refunds"
cp "$tmp/reservations.js" src/inventory/reservations.js
cp "$tmp/client.js" src/pricing/client.js
cp "$tmp/fakes.js" src/dev/fakes.js
git add -A
commit "$(ago '4 days ago' -4d)" "perf(pricing): use pricing service for quotes"
cp "$tmp/README.md" README.md
git add README.md
commit "$(ago '1 day ago' -1d)" "docs: list dev fakes in readme"
rm -rf "$tmp"
