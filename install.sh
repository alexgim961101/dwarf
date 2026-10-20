#!/usr/bin/env bash
# 이 저장소의 skills/ 하위 스킬을 Claude Code / Codex / Pi / OMP 스킬 디렉토리에 심볼릭 링크로 설치한다.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$REPO_DIR/skills"

usage() {
  cat <<'EOF'
사용법: ./install.sh [--uninstall] [--tool claude|codex|pi|omp] [스킬명 ...]

  인자 없이 실행하면 저장소의 모든 스킬을 설치한다.
  스킬명을 지정하면 해당 스킬만 대상으로 한다.

  --tool <도구>  지정한 도구에만 설치/제거한다. 생략하면 감지된 모든 도구.
  --uninstall    이 저장소가 만든 심볼릭 링크를 제거한다.
  -h, --help     이 도움말을 출력한다.

설치 위치 (해당 설정 디렉토리가 있는 도구에만 설치한다):
  Claude Code   ~/.claude/skills/<스킬명>
  Codex         ~/.codex/skills/<스킬명>
  Pi            ~/.pi/agent/skills/<스킬명>
  OMP           ~/.omp/agent/skills/<스킬명>

Pi의 PI_CODING_AGENT_DIR가 설정되어 있으면 그 디렉토리의 skills/를 사용한다.
사용자 지정 경로는 절대 경로로 지정한다.

심볼릭 링크 방식이므로 이 저장소를 옮기거나 삭제하면 설치가 깨진다.
이미 같은 이름의 파일/디렉토리나 다른 대상을 가리키는 링크가 있으면
덮어쓰지 않고 건너뛴다.
EOF
}

uninstall=0
tool=all
requested=()
while [ $# -gt 0 ]; do
  case "$1" in
    --uninstall) uninstall=1 ;;
    --tool)
      if [ $# -lt 2 ]; then
        echo "--tool 뒤에 claude, codex, pi 또는 omp를 지정하세요." >&2
        exit 1
      fi
      case "$2" in
        claude|codex|pi|omp) tool="$2" ;;
        *) echo "알 수 없는 도구: $2 (claude, codex, pi, omp 중 선택)" >&2; exit 1 ;;
      esac
      shift
      ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "알 수 없는 옵션: $1" >&2; usage >&2; exit 1 ;;
    *) requested+=("$1") ;;
  esac
  shift
done

# SKILL.md 를 가진 디렉토리만 스킬로 취급한다
all_skills=()
for dir in "$SKILLS_DIR"/*/; do
  [ -f "$dir/SKILL.md" ] || continue
  all_skills+=("$(basename "$dir")")
done

if [ ${#all_skills[@]} -eq 0 ]; then
  echo "설치할 스킬을 찾지 못했습니다: $SKILLS_DIR" >&2
  exit 1
fi

skills=()
if [ ${#requested[@]} -eq 0 ]; then
  skills=("${all_skills[@]}")
else
  for name in "${requested[@]}"; do
    found=0
    for s in "${all_skills[@]}"; do
      [ "$s" = "$name" ] && found=1 && break
    done
    if [ "$found" -eq 0 ]; then
      echo "존재하지 않는 스킬: $name" >&2
      echo "사용 가능: ${all_skills[*]}" >&2
      exit 1
    fi
    skills+=("$name")
  done
fi

targets=()
for candidate in claude codex pi omp; do
  [ "$tool" = all ] || [ "$tool" = "$candidate" ] || continue
  case "$candidate" in
    claude) config_dir="$HOME/.claude" ;;
    codex) config_dir="$HOME/.codex" ;;
    pi) config_dir="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}" ;;
    omp) config_dir="$HOME/.omp/agent" ;;
  esac
  [ -d "$config_dir" ] && targets+=("$config_dir/skills")
done

if [ ${#targets[@]} -eq 0 ]; then
  echo "설치 대상 설정 디렉토리를 찾지 못했습니다 (도구: $tool)." >&2
  echo "Claude Code, Codex, Pi 또는 OMP를 먼저 실행해 설정 디렉토리를 만든 뒤 다시 실행하세요." >&2
  echo "확인 위치: $HOME/.claude, $HOME/.codex, ${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}, $HOME/.omp/agent" >&2
  exit 1
fi

for target in "${targets[@]}"; do
  echo "== $target"
  [ "$uninstall" -eq 1 ] || mkdir -p "$target"
  [ -d "$target" ] || continue

  for name in "${skills[@]}"; do
    link="$target/$name"
    src="$SKILLS_DIR/$name"

    if [ "$uninstall" -eq 1 ]; then
      if [ -L "$link" ] && [ "$(readlink -f "$link")" = "$(readlink -f "$src")" ]; then
        rm "$link"
        echo "  제거: $name"
      elif [ -e "$link" ] || [ -L "$link" ]; then
        echo "  건너뜀 (이 저장소가 설치한 것이 아님): $name"
      fi
      continue
    fi

    if [ -L "$link" ]; then
      if [ "$(readlink -f "$link")" = "$(readlink -f "$src")" ]; then
        echo "  이미 설치됨: $name"
      else
        echo "  건너뜀 (다른 대상을 가리키는 링크): $name -> $(readlink "$link")"
      fi
      continue
    fi

    if [ -e "$link" ]; then
      echo "  건너뜀 (같은 이름의 파일/디렉토리가 있음): $name"
      continue
    fi

    ln -s "$src" "$link"
    echo "  설치: $name"
  done
done
