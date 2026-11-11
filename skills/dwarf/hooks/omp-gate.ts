// dwarf 관문 hook의 omp 연결부. omp 확장 이벤트를 Claude Code hook 입력 모양으로 바꿔 gate.py --harness omp 에 넘긴다.
// install.sh가 ~/.omp/agent/extensions/dwarf-gate.ts 로 링크한다. 모든 세션에 실리고, gate.py가 /skill:dwarf를 부른 요청부터 판정한다.
// 규칙은 skills/dwarf/references/gate.md.
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const GATE = join(homedir(), ".omp/agent/skills/dwarf/hooks/gate.py");
// 결과를 다시 보지 않는 도구. write는 호출 전에 판정이 끝난다
const NO_POST = new Set(["read", "grep", "glob", "find", "ls", "todo", "write"]);

type Run = { code: number | null; stdout: string; stderr: string };

function gate(payload: Record<string, unknown>): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn("python3", [GATE, "--harness", "omp"]);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 10_000);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", () => { // hook 오류로 작업을 막지 않는다
      clearTimeout(timer);
      resolve({ code: null, stdout: "", stderr: "" });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}

function json(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export default function (pi: any) {
  // session_stop이 되돌려 보낸 안내. omp는 이것도 before_agent_start의 prompt로 넘기므로 사용자 답으로 보지 않는다
  let continuation = "";
  const base = (ctx: any) => ({ session_id: ctx.sessionManager?.getSessionId?.(), cwd: ctx.cwd });

  // UserPromptSubmit. -p 실행에는 input 이벤트가 없어 여기서 받는다. 출력은 Claude Code처럼 맥락에 넣는다
  pi.on("before_agent_start", async (event: any, ctx: any) => {
    const prompt = String(event.prompt ?? "");
    if (event.reason !== "prompt" || !prompt.trim() || prompt === continuation) return;
    const { stdout } = await gate({ ...base(ctx), hook_event_name: "UserPromptSubmit", prompt });
    if (stdout.trim()) return { message: { customType: "dwarf-gate", content: stdout.trim(), display: false } };
  });

  pi.on("tool_call", async (event: any, ctx: any) => {
    const { stdout } = await gate({
      ...base(ctx), hook_event_name: "PreToolUse", tool_name: event.toolName, tool_input: event.input ?? {},
    });
    const out = json(stdout)?.hookSpecificOutput;
    if (out?.permissionDecision === "deny") return { block: true, reason: out.permissionDecisionReason };
  });

  // PostToolUse. exit 2의 안내를 도구 결과 뒤에 붙인다
  pi.on("tool_result", async (event: any, ctx: any) => {
    if (NO_POST.has(event.toolName)) return;
    const { code, stderr } = await gate({
      ...base(ctx), hook_event_name: "PostToolUse", tool_name: event.toolName, tool_input: event.input ?? {},
    });
    if (code === 2 && stderr.trim()) return { content: [...(event.content ?? []), { type: "text", text: stderr.trim() }] };
  });

  pi.on("session_stop", async (event: any, ctx: any) => {
    const { stdout } = await gate({
      session_id: event.session_id, cwd: ctx.cwd, hook_event_name: "Stop", stop_hook_active: event.stop_hook_active,
    });
    const out = json(stdout);
    if (out?.decision !== "block") return;
    continuation = out.reason;
    return { decision: "block", reason: out.reason };
  });
}
