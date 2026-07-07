import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

function runtimeCwd() {
  return Function("return process.cwd()")() as string;
}

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function run(cmd: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: false });
    let err = "";
    child.stderr.on("data", (chunk) => { err += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(err || `${cmd} exited ${code}`)));
  });
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const cwd = path.resolve(process.env.DEV_WORKSPACE_ROOT || runtimeCwd());
    const tmp = path.join(os.tmpdir(), `dashboard-export-${Date.now()}.zip`);

    if (process.platform === "win32") {
      const ps = `Compress-Archive -Force -Path app,lib,scripts,package.json,pnpm-lock.yaml,tsconfig.json,next.config.ts,README.md,NEON_SCHEMA.sql -DestinationPath '${tmp.replace(/'/g, "''")}'`;
      await run("powershell.exe", ["-NoProfile", "-Command", ps], cwd);
    } else {
      await run("zip", ["-qr", tmp, "app", "lib", "scripts", "package.json", "pnpm-lock.yaml", "tsconfig.json", "next.config.ts", "README.md", "NEON_SCHEMA.sql"], cwd);
    }

    const file = await fs.readFile(tmp);
    await fs.rm(tmp, { force: true });
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="chan-dashboard-export.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return jsonError(error?.message || "Export failed", authStatus(error));
  }
}
