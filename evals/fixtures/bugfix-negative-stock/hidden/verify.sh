#!/usr/bin/env bash
# 숨김 테스트의 변별력 확인. 모델 실행 없이 돈다.
#   결함 원본            → 필수 숨김 테스트 중 하나 이상 실패
#   fixes/reference.patch → 숨김·보이는 테스트 모두 통과
#   fixes/wrong-*.patch   → 필수 숨김 테스트 중 하나 이상 실패 (흔한 잘못된 수정)
# 사용법: hidden/verify.sh   어디서 불러도 된다. 하나라도 기대와 다르면 종료 코드 1.
set -u
here=$(cd "$(dirname "$0")" && pwd)
# 바꾸기 전 저장소. 원본과 결과를 비교하는 숨김 테스트(refactoring fixture)가 쓴다.
export ORIGINAL_REPO="$here/../repo"
bad=0

run() { # 이름 기대(fail|pass) [패치]
  local name=$1 expect=$2 patch=${3:-} tmp failed visible
  tmp=$(mktemp -d)
  cp -RH "$here/../repo" "$tmp/repo"
  if [ -n "$patch" ] && ! patch -p1 -s -d "$tmp/repo" <"$patch"; then
    printf '%-26s 패치 적용 실패\n' "$name"; bad=1; rm -rf "$tmp"; return
  fi
  mkdir "$tmp/repo/.grade" && cp "$here/grade.test.js" "$tmp/repo/.grade/"
  failed=$(cd "$tmp/repo" && node --test --test-reporter=tap .grade/grade.test.js 2>&1 \
    | grep -E '^not ok ' | sed 's/ # .*//; s/^not ok [0-9]* - //' | grep -v '^optional-' | tr '\n' ' ')
  if (cd "$tmp/repo" && npm test >/dev/null 2>&1); then visible=통과; else visible=실패; fi
  rm -rf "$tmp"
  local ok=예
  case $expect in
    pass) [ -z "$failed" ] && [ "$visible" = 통과 ] || ok=아니오 ;;
    fail) [ -n "$failed" ] || ok=아니오 ;;
  esac
  [ "$ok" = 예 ] || bad=1
  printf '%-26s 기대대로: %s  보이는 테스트: %s  숨김 실패: %s\n' "$name" "$ok" "$visible" "${failed:-없음}"
}

run 원본 fail
for p in "$here"/fixes/reference*.patch; do run "$(basename "$p" .patch)" pass "$p"; done
for p in "$here"/fixes/wrong-*.patch; do run "$(basename "$p" .patch)" fail "$p"; done
exit $bad
