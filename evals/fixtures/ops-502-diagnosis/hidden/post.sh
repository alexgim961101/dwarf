#!/usr/bin/env bash
set -u
cd "$1" && docker compose down -v --remove-orphans >/dev/null 2>&1
