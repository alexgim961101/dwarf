#!/usr/bin/env bash
# 커밋 세 개. 마지막 커밋(api 요청 ID)은 오늘 배포된 미끼다.
set -eu
ws=$1
h=$(cd "$(dirname "$0")" && pwd)/history
tmp=$(mktemp -d)
ago() { date -u -d "$1" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v"$2" '+%Y-%m-%dT%H:%M:%SZ'; }
commit() { GIT_AUTHOR_DATE=$1 GIT_COMMITTER_DATE=$1 git -c user.name=dev -c user.email=dev@example.com commit -q -m "$2"; }
cd "$ws"
cp api/server.js deploy.sh "$tmp/"
cp "$h/server.v1.js" api/server.js
rm deploy.sh
git add -A
commit "$(ago '30 days ago' -30d)" "feat: edge stack with nginx and api"
cp "$tmp/deploy.sh" deploy.sh
git add -A
commit "$(ago '12 days ago' -12d)" "chore: deploy api without restarting nginx"
cp "$tmp/server.js" api/server.js
git add -A
commit "$(ago '3 hours ago' -3H)" "feat(api): add request id header and access log"
rm -rf "$tmp"
