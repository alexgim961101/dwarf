#!/usr/bin/env bash
# 작업 공간에 커밋 세 개를 만든다. 원인(.env PORT)은 약 20시간 전, 미끼(nginx 타임아웃)는 2시간 전.
set -eu
ws=$1
h=$(cd "$(dirname "$0")" && pwd)/history
tmp=$(mktemp -d)
ago() { date -u -d "$1" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v"$2" '+%Y-%m-%dT%H:%M:%SZ'; }
commit() { GIT_AUTHOR_DATE=$1 GIT_COMMITTER_DATE=$1 git -c user.name=dev -c user.email=dev@example.com commit -q -m "$2"; }
cd "$ws"
cp .env nginx/default.conf "$tmp/"
cp "$h/env.v1" .env
cp "$h/default.conf.v1" nginx/default.conf
git add -A
commit "$(ago '3 days ago' -3d)" "feat: local dev stack for shop api"
cp "$tmp/.env" .env
git add .env
commit "$(ago '20 hours ago' -20H)" "chore: align local env with staging"
cp "$tmp/default.conf" nginx/default.conf
git add nginx/default.conf
commit "$(ago '2 hours ago' -2H)" "perf: tune nginx proxy timeouts"
rm -rf "$tmp"
