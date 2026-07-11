import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { requireDevWorkspace } from "@/lib/devGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

type CmdSpec = { cmd: string; args: string[]; label: string };

const isWindows = process.platform === "win32";
const npx = isWindows ? "npx.cmd" : "npx";
const git = isWindows ? "git.exe" : "git";

const PRESETS: Record<string, CmdSpec> = {
  build: { cmd: process.execPath, args: ["scripts/build.mjs"], label: "npm/pnpm build" },
  install: { cmd: npx, args: ["--yes", "pnpm@10.13.1", "install"], label: "pnpm install" },
  "git-status": { cmd: git, args: ["status", "--short", "--branch"], label: "git status" },
  "git-diff": { cmd: git, args: ["diff", "--stat"], label: "git diff stat" },
  "git-pull": { cmd: git, args: ["pull"], label: "git pull" },
  "git-add": { cmd: git, args: ["add", "."], label: "git add ." },
};

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function runtimeCwd() {
  return Function("return process.cwd()")() as string;
}

function workspaceRoot() {
  return process.env.DEV_WORKSPACE_ROOT || path.resolve(runtimeCwd());
}

function run(spec: CmdSpec, timeoutMs = 70000) {
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null; output: string }>((resolve, reject) => {
    const child = spawn(spec.cmd, spec.args, {
      cwd: workspaceRoot(),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || "1" },
      shell: false,
    });
    let output = `$ ${[spec.cmd, ...spec.args].join(" ")}\n`;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      output += "\n[dashboard] command timed out and was stopped\n";
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { output += chunk.toString(); if (output.length > 240000) output = output.slice(-240000); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); if (output.length > 240000) output = output.slice(-240000); });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, output });
    });
  });
}

function runShell(command: string, timeoutMs = 70000) {
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null; output: string }>((resolve, reject) => {
    const child = spawn(command, [], {
      cwd: workspaceRoot(),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || "1" },
      shell: true,
    });
    let output = `$ ${command}\n`;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      output += "\n[dashboard] shell command timed out and was stopped\n";
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { output += chunk.toString(); if (output.length > 240000) output = output.slice(-240000); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); if (output.length > 240000) output = output.slice(-240000); });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, output });
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    requireDevWorkspace();
    const body = await req.json().catch(() => ({}));
    const preset = String(body.preset || "");
    const custom = String(body.command || "").trim();

    let result: { code: number | null; signal: NodeJS.Signals | null; output: string };

    if (preset === "git-commit") {
      const message = String(body.message || "dashboard update").replace(/[\r\n]/g, " ").slice(0, 180) || "dashboard update";
      result = await run({ cmd: git, args: ["commit", "-m", message], label: "git commit" });
    } else if (preset === "git-push") {
      result = await run({ cmd: git, args: ["push"], label: "git push" });
    } else if (PRESETS[preset]) {
      result = await run(PRESETS[preset]);
    } else if (custom && process.env.DEV_ALLOW_ARBITRARY_COMMANDS === "true") {
      result = await runShell(custom);
    } else {
      return jsonError("Command blocked. Use preset buttons or set DEV_ALLOW_ARBITRARY_COMMANDS=true for custom shell commands.", 403);
    }

    return NextResponse.json({ ok: result.code === 0, code: result.code, signal: result.signal, output: result.output });
  } catch (error: any) {
    return jsonError(error?.message || "Terminal command failed", authStatus(error));
  }
}
