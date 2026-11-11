#!/usr/bin/env python3
"""dwarf 관문 hook. /dwarf를 부르면 Claude Code가 등록하고 그 세션 동안 돈다.

- PreToolUse(Read|Edit|Write|NotebookEdit|Bash): 읽은 dwarf 문서를 기록한다. playbook을 열기 전에는
  dwarf 문서를 읽지 않는 Bash와 파일 수정을 막고, 관문 기록 없이 작업 트리 파일을 바꾸려 하면 막는다.
- PostToolUse(Bash): 관문이 열리기 전에 Bash로 작업 트리가 바뀌었으면 알린다.
- UserPromptSubmit: 승인 대기(pending) 중에 사용자가 답하면 answered로 바꾼다.
- Stop: playbook의 inspect 점검을 거치지 않고 끝내려 하면 한 번 되돌려 보낸다.

모델은 <작업 디렉토리>/.docs/dwarf/gate에 기록하고, hook은 파일 쓰기 도구로 쓴 기록만 세션별 상태로 받아들인다.
--harness codex|omp: Codex hooks.json과 omp 확장(omp-gate.ts)이 부른다. 입력은 Claude Code hook과 같은 모양이다.
그 harness에서는 hook이 모든 세션에 걸리므로 dwarf를 부른 요청부터 판정한다.
규칙은 skills/dwarf/references/gate.md.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

HARNESS = sys.argv[sys.argv.index("--harness") + 1] if "--harness" in sys.argv[1:-1] else "claude"
# Codex·omp는 hook이 모든 세션에 걸린다. dwarf를 부른 요청부터 판정한다
INVOKE = {"codex": re.compile(r"(?:^|\s)\$dwarf\b"), "omp": re.compile(r"(?:^|\s)/skill:dwarf\b")}.get(HARNESS)
# 안내에 쓰는 도구 이름. Codex는 셸이 읽기 도구라 playbook을 열기 전에도 셸을 막지 않는다
WORDS = {
    "claude": {"read": "Read", "write": "Write 도구",
               "before": "Read·Grep과 dwarf 문서·설정을 읽는 Bash만 쓸 수 있다. 파일 수정과 관문 기록은 막힌다."},
    "codex": {"read": "셸", "write": "apply_patch", "before": "파일 수정과 관문 기록은 막힌다."},
    "omp": {"read": "read", "write": "write 도구",
            "before": "read·grep·glob과 dwarf 문서·설정을 읽는 bash만 쓸 수 있다. 파일 수정과 관문 기록은 막힌다."},
}[HARNESS]
OMP_TOOLS = {"read": "Read", "write": "Write", "edit": "Edit", "bash": "Bash"}  # 나머지(grep·glob 등)는 읽기로 본다
PATCH_FILE = re.compile(r"^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$", re.M)  # Codex apply_patch
OMP_EDIT_FILE = re.compile(r"^\[\s*(.+?)#\w+\]\s*$", re.M)  # omp edit의 파일 머리 [경로#해시]

GATE = Path(".docs/dwarf/gate")
OPEN = {"approved", "none"}
DWARF = Path(__file__).absolute().parent.parent  # 안내에 쓰는 경로. 모델이 아는 설치 경로 그대로
SKILLS = Path(__file__).resolve().parent.parent.parent  # 심볼릭 링크를 푼 skills/
DOC = re.compile(r"(?:playbooks/[a-z-]+|inspect/SKILL|root-cause/SKILL)\.md")
DWARF_FILES = re.compile(r"\.claude/(?:skills|agents)/|\.codex/skills/|\.omp/agent/skills/|skill://|\.config/dwarf/|\.dwarf/agents\.md")
MAPPING = re.compile(r"/(?:\.config/dwarf|\.dwarf)/agents\.md$")  # references/agents.md의 Agent 매핑 파일
GATE_BY_BASH = re.compile(r"(?:>>?|\btee\b(?:\s+-a)?)\s*[\"']?[^\s;|&]*\.docs/dwarf/gate(?![\w.-])"
                          r"|\bsed\s+-i\b[^;|&]*\.docs/dwarf/gate(?![\w.-])")
INSPECT_BEFORE_GATE = {"feature", "incident"}
INSPECT_AFTER_CHANGE = {"bug-fix", "incident", "feature", "refactoring", "perf"}
ROOT_CAUSE_BEFORE_GATE = {"bug-fix"}  # 1단계를 root-cause 절차로 한다. 읽지 않고 직접 조사하는 실행이 많았다

NO_PLAYBOOK = f"""dwarf: playbook을 아직 열지 않았다. 분류한 playbook {DWARF}/playbooks/<이름>.md 를 {WORDS['read']}로 열고 단계를 상태 파일 <작업 디렉토리>/.docs/dwarf/state.md 에 옮긴 뒤 작업한다.
그 전에는 {WORDS['before']}
- 맞는 playbook이 없으면 <작업 디렉토리>/.docs/dwarf/gate 를 {WORDS['write']}로 세 줄로 쓴다. status: none / playbook: 없음 / reason: 맞는 playbook이 없는 이유
- Agent 매핑 파일(~/.config/dwarf/agents.md, .dwarf/agents.md)은 playbook 없이 쓸 수 있다. /dwarf agents는 {DWARF}/references/agents.md 를 읽고 이것만 한다."""

GATE_WHOLE = f"dwarf 관문: 관문 기록은 {WORDS['write']}로 세 줄 전체를 다시 쓴다. 부분 수정은 hook이 내용을 확인할 수 없다."

NO_INSPECT = (
    "dwarf: playbook의 inspect 점검을 거치지 않고 끝내려 한다. {when} {inspect} 를 읽고 점검한 뒤 "
    "점검 결과를 넣어 보고 전체를 다시 쓴다. 마지막 메시지만 보고로 남는다. "
    "그 단계까지 가지 않고 멈췄다면 이유를 한 줄 넣어 보고를 다시 쓴다."
)

NO_DECISION = f"""dwarf 관문: 작업 트리를 바꾸기 전에 관문을 기록한다.
<작업 디렉토리>/.docs/dwarf/gate 를 {WORDS['write']}로 세 줄로 쓴다.
status: pending 또는 none
playbook: bug-fix, incident, feature, refactoring, perf, chore 중 하나. 맞는 playbook이 없으면 없음
reason: 한 줄
- bug-fix는 항상 pending. 기록 전에 원인 조사 절차(root-cause/SKILL.md)를 읽는다. 해결안 후보는 작업 트리 밖 worktree에서 시험하고 관문 1 보고 뒤 멈춘다.
- incident는 항상 pending. 관문 1 전에는 실행 중인 대상의 상태를 바꾸는 명령(배포·재시작·reload, 그런 스크립트)도 실행하지 않는다.
- feature는 다음 중 하나라도 해당하면 pending, 아니면 none과 이유. 설계 요청 / 돈·권한·개인정보·저장 데이터 형식·공개 계약의 기존 동작 변경 / 둘 이상의 모듈이나 외부 서비스 호출 변경 / 결과가 크게 갈리는 해석 / 작업 단위 다섯 초과. 애매하면 해당으로 본다.
- refactoring, perf, chore는 none과 이유.
- 원인 조사용 임시 코드와 계측도 작업 트리 밖 worktree에서 한다.
pending이면 관문 보고를 하고 이번 턴을 끝낸다."""

PENDING = (
    "dwarf 관문: 승인 대기(pending)다. 관문 보고를 하고 이번 턴을 끝낸다. "
    "사용자가 답하기 전에는 작업 트리를 바꿀 수 없다. 시험과 계측은 작업 트리 밖 worktree에서 한다."
)

ANSWERED = (
    "dwarf 관문: 사용자가 관문 보고에 답했다(answered). 답이 승인이면 .docs/dwarf/gate의 status를 "
    "approved로 바꾼 뒤 수정한다. 승인이 아니면 status: pending으로 다시 쓰고 바뀐 보고를 한다. "
    f"hook이 이 파일을 고쳐 썼으므로 먼저 {WORDS['read']}로 읽은 뒤 쓴다."
)


def git(cwd, *args):
    result = subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else None


def toplevel(path):
    out = git(path, "rev-parse", "--show-toplevel")
    return Path(out.strip()).resolve() if out else None


def state_file(session):
    directory = Path(tempfile.gettempdir()) / "dwarf-gate"
    directory.mkdir(exist_ok=True)
    return directory / f"{session}.json"


def prune_old_states(days=7):
    cutoff = time.time() - days * 86400
    for old in (Path(tempfile.gettempdir()) / "dwarf-gate").glob("*.json"):
        try:
            if old.stat().st_mtime < cutoff:
                old.unlink()
        except OSError:
            pass


def load(session):
    try:
        return json.loads(state_file(session).read_text())
    except (OSError, ValueError):
        return {}


def save(session, state):
    state_file(session).write_text(json.dumps(state, ensure_ascii=False))


def parse(text):
    fields = {}
    for line in text.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            fields[key.strip().lower()] = value.strip()
    return fields


def tree_changes(top):
    """작업 트리의 변경(추적 파일 diff와 .docs 밖 새 파일)과 그 지문."""
    diff = git(top, "diff", "HEAD")
    if diff is None:
        return None, []
    names = (git(top, "diff", "HEAD", "--name-only") or "").split()
    parts = [diff]
    for name in sorted((git(top, "ls-files", "--others", "--exclude-standard") or "").splitlines()):
        if name.startswith(".docs/") or name.endswith("/"):  # 끝이 /면 안에 둔 worktree 같은 별도 저장소
            continue
        names.append(name)
        try:
            stat = (top / name).stat()
            parts.append(f"{name}:{stat.st_size}:{stat.st_mtime_ns}")
        except OSError:
            pass
    return hashlib.sha256("\n".join(parts).encode()).hexdigest(), names


def guarded(root, top, target):
    """작업 트리 안이고 .docs/ 밖이며 같은 worktree에 속한 파일이면 보호 대상."""
    base = top or root
    if not target.is_relative_to(base):
        return False
    if target.is_relative_to(root / ".docs") or target.is_relative_to(base / ".docs"):
        return False
    if top is None:
        return True
    parent = target.parent
    while not parent.exists():
        parent = parent.parent
    return toplevel(parent) == top


def resolve(cwd, path):
    target = Path(path.strip())
    return (target if target.is_absolute() else Path(cwd) / target).resolve()


def normalize(tool, tool_input):
    """도구 호출을 Claude Code 도구 이름, 입력, 바꾸려는 파일 목록으로 바꾼다."""
    if HARNESS == "omp":
        tool = OMP_TOOLS.get(tool, "Read")
        path = tool_input.get("path") or ""
        if tool == "Read" and re.fullmatch(r"skill://[\w-]+", path):  # read skill://<이름>은 그 스킬의 SKILL.md
            path += "/SKILL.md"
        tool_input = {**tool_input, "file_path": path}
        if tool == "Edit":
            return tool, tool_input, OMP_EDIT_FILE.findall(tool_input.get("input") or "")
    if HARNESS == "codex" and tool != "Bash":
        patch = tool_input.get("command") or ""
        return "Patch", tool_input, [a or b for a, b in PATCH_FILE.findall(patch)]
    path = tool_input.get("file_path") or tool_input.get("notebook_path")
    return tool, tool_input, [path] if tool not in {"Read", "Bash"} and path else []


def patched(patch, cwd, gate_path, current):
    """Codex apply_patch를 관문 파일에 적용한 내용. 적용할 수 없으면 None."""
    for section in re.split(r"^(?=\*\*\* (?:Add|Update|Delete) File: )", patch, flags=re.M):
        head, _, body = section.partition("\n")
        match = re.match(r"\*\*\* (Add|Update|Delete) File: (.+)", head)
        if not match or resolve(cwd, match.group(2)) != gate_path.resolve():
            continue
        lines = [line for line in body.splitlines() if not line.startswith("*** ")]
        if match.group(1) == "Delete":
            return ""
        if match.group(1) == "Add":
            return "\n".join(line[1:] for line in lines if line.startswith("+")) + "\n"
        text = current
        for hunk in re.split(r"^@@.*$", "\n".join(lines), flags=re.M):
            hunk_lines = [line for line in hunk.splitlines() if line[:1] in {" ", "+", "-"}]
            old = "\n".join(line[1:] for line in hunk_lines if line[0] != "+")
            new = "\n".join(line[1:] for line in hunk_lines if line[0] != "-")
            if old not in text:
                return None
            text = text.replace(old, new, 1)
        return text
    return None


def new_gate_text(tool, tool_input, gate_path, cwd):
    """쓰고 나면 관문 파일에 남을 내용. 입력만으로 알 수 없으면 None."""
    try:
        current = gate_path.read_text()
    except OSError:
        current = ""
    if tool == "Patch":
        return patched(tool_input.get("command") or "", cwd, gate_path, current)
    if tool == "Write":
        return tool_input.get("content", "")
    if HARNESS == "omp":  # omp edit은 줄 번호·해시로 고친다
        return None
    old, new = tool_input.get("old_string", ""), tool_input.get("new_string", "")
    return current.replace(old, new) if tool_input.get("replace_all") else current.replace(old, new, 1)


def check_transition(fields, state):
    status, playbook = fields.get("status", ""), fields.get("playbook", "")
    if status not in {"pending", "approved", "none"}:
        return "status는 pending, approved, none 중 하나다. answered는 hook만 쓴다."
    if status == "pending" and playbook in ROOT_CAUSE_BEFORE_GATE and "root-cause/SKILL.md" not in state.get("docs", []):
        return (f"{playbook} 1단계는 원인 조사 절차로 한다. 관문을 기록하기 전에 "
                f"{DWARF.parent / 'root-cause' / 'SKILL.md'} 를 {WORDS['read']}로 읽고, 1단계를 그 절차대로 한다.")
    if status == "approved" and state.get("status") not in {"answered", "approved"}:
        return "approved는 사용자가 관문 보고에 답한 뒤(answered)에만 쓸 수 있다. 지금은 관문 보고를 하고 이번 턴을 끝낸다."
    if status == "none" and playbook in {"bug-fix", "incident"}:
        return f"{playbook}는 관문을 건너뛸 수 없다. status: pending으로 쓰고 관문 1 보고 뒤 멈춘다."
    if status == "none" and not fields.get("reason"):
        return "none에는 관문 대상이 아닌 이유(reason)가 필요하다."
    return None


def missing_inspect(state, top):
    """inspect 점검을 거쳐야 하는 시점인데 inspect를 읽지 않았으면 되돌려 보낼 안내."""
    if "inspect/SKILL.md" in state.get("docs", []):
        return None
    status, playbook = state.get("status"), state.get("playbook")
    inspect = DWARF.parent / "inspect" / "SKILL.md"
    if status == "pending" and playbook in INSPECT_BEFORE_GATE:
        return NO_INSPECT.format(when="관문 보고 전에 점검한다(feature·incident 5단계).", inspect=inspect)
    if status in OPEN and playbook in INSPECT_AFTER_CHANGE and top and (
        tree_changes(top)[0] != state.get("baseline") or git(top, "rev-parse", "HEAD") != state.get("head")
    ):
        return NO_INSPECT.format(when="작업 트리를 바꿨으면 리뷰 단계에서 점검한다.", inspect=inspect)
    return None


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }}, ensure_ascii=False))
    sys.exit(0)


def main():
    data = json.load(sys.stdin)
    event = data.get("hook_event_name")
    session = data.get("session_id") or "unknown"
    project = os.environ.get("CLAUDE_PROJECT_DIR") if HARNESS == "claude" else None  # 다른 harness는 Claude Code에서 띄워도 물려받은 값을 쓰지 않는다
    root = Path(project or data.get("cwd") or os.getcwd()).resolve()
    state = load(session)

    if INVOKE and not state.get("active"):
        if event != "UserPromptSubmit" or not INVOKE.search(data.get("prompt") or ""):
            return
        state["active"] = True  # 이 세션에서 dwarf를 불렀다. 이후 모든 요청에 판정한다
    top = toplevel(root)
    gate_path = root / GATE

    if "baseline" not in state:  # 세션의 첫 hook 호출. 그때의 작업 트리를 기준으로 삼는다
        state["baseline"] = tree_changes(top)[0] if top else None
        state["head"] = git(top, "rev-parse", "HEAD") if top else None  # 커밋하면 diff가 비므로 HEAD도 본다
        save(session, state)
        prune_old_states()

    if event == "UserPromptSubmit":
        if state.get("status") == "pending":
            state["status"] = "answered"
            save(session, state)
            try:
                lines = gate_path.read_text().splitlines()
                gate_path.write_text("\n".join(
                    "status: answered" if line.strip().lower().startswith("status:") else line for line in lines
                ) + "\n")
            except OSError:
                pass
            print(ANSWERED)
        return

    if event == "PostToolUse":
        if GATE_BY_BASH.search((data.get("tool_input") or {}).get("command") or ""):
            print("dwarf 관문: Bash로 쓴 관문 기록은 hook이 받아들이지 않는다. 세션의 관문 상태는 그대로다. "
                  f"같은 내용을 {WORDS['write']}로 다시 쓴다.", file=sys.stderr)
            sys.exit(2)
        if state.get("status") in OPEN or not top:
            return
        fingerprint, names = tree_changes(top)
        if fingerprint and fingerprint != state.get("baseline"):
            print(f"{PENDING if state.get('status') else NO_DECISION}\n관문이 열리기 전에 작업 트리가 바뀌었다: "
                  f"{', '.join(names)}. 이번 실행에서 바꾼 것을 되돌린다.", file=sys.stderr)
            sys.exit(2)
        return

    if event == "Stop":
        problem = None if data.get("stop_hook_active") else missing_inspect(state, top)
        if problem:
            print(json.dumps({"decision": "block", "reason": problem}, ensure_ascii=False))
        return

    if event != "PreToolUse":
        return
    tool, tool_input, paths = normalize(data.get("tool_name"), data.get("tool_input") or {})
    raw = (tool_input.get("command") if tool == "Bash"
           else tool_input.get("file_path") or tool_input.get("notebook_path") or " ".join(paths)) or ""
    docs = set(state.get("docs", [])) | set(DOC.findall(raw))
    if len(docs) != len(state.get("docs", [])):
        state["docs"] = sorted(docs)
        save(session, state)
    opened = state.get("playbook") == "없음" or any(doc.startswith("playbooks/") for doc in docs)

    if tool == "Read":
        return
    if tool == "Bash":
        if not opened and HARNESS != "codex" and not (DWARF_FILES.search(raw) or str(SKILLS) in raw):
            deny(NO_PLAYBOOK)
        return
    cwd = data.get("cwd") or root
    targets = [resolve(cwd, path) for path in paths]

    others = [target for target in targets if target != gate_path.resolve()]
    if len(others) < len(targets):
        text = new_gate_text(tool, tool_input, gate_path, cwd)
        if text is None:
            deny(GATE_WHOLE)
        fields = parse(text)
        if not opened and (fields.get("status"), fields.get("playbook")) != ("none", "없음"):
            deny(NO_PLAYBOOK)
        problem = check_transition(fields, state)
        if problem:
            deny(f"dwarf 관문: {problem}")
        state.update(status=fields["status"], playbook=fields.get("playbook", ""), reason=fields.get("reason", ""))
        save(session, state)
        opened = opened or state["playbook"] == "없음"
    if not others:
        return

    if not opened:
        if all(MAPPING.search(str(target)) for target in others):
            return
        deny(NO_PLAYBOOK)
    if state.get("status") in OPEN or not any(guarded(root, top, target) for target in others):
        return
    deny({"pending": PENDING, "answered": ANSWERED}.get(state.get("status"), NO_DECISION))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # hook 오류로 작업을 막지 않는다
        print(f"dwarf gate hook error: {error}", file=sys.stderr)
        sys.exit(0)
