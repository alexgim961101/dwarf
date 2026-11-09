# run.sh·run-codex.sh가 쓰는 작업 공간 준비 함수.
# make_workspace <fixture 디렉토리> <작업 공간 경로>
#   fixture의 repo/를 복사해 git 저장소로 만들고, hidden/history.sh가 있으면 그것으로 이력을 만든다.
#   끝나면 ws(실경로)와 BASE(시작 커밋)를 설정하고 BASE를 내보낸다. 채점 자료(hidden, rubric)는 넣지 않는다.
make_workspace() {
  local F=$1
  cp -RH "$F/repo" "$2"
  ws=$(cd "$2" && pwd -P)
  git -C "$ws" init -q
  if [ -x "$F/hidden/history.sh" ]; then
    "$F/hidden/history.sh" "$ws"
  else
    git -C "$ws" add -A
    git -C "$ws" -c user.name=dev -c user.email=dev@example.com commit -qm "initial"
  fi
  BASE=$(git -C "$ws" rev-parse HEAD)
  export BASE
}
