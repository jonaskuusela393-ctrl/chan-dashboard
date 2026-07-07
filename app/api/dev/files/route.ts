import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  children?: TreeNode[];
};

const SKIP = new Set(["node_modules", ".next", ".git", ".turbo", "dist", "out"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".scss", ".html", ".md", ".txt", ".env", ".yml", ".yaml", ".sql", ".mjs", ".cjs", ".svg", ".xml", ".gitignore", ".npmrc"]);

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function runtimeCwd() {
  return Function("return process.cwd()")() as string;
}

function root() {
  return path.resolve(process.env.DEV_WORKSPACE_ROOT || runtimeCwd());
}

function cleanRel(input: string) {
  return input.replace(/\\/g, "/").replace(/^\/+/, "").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
}

function resolveSafe(input: string) {
  const base = root();
  const rel = cleanRel(input);
  const full = path.resolve(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) throw new Error("path outside workspace blocked");
  return { base, rel, full };
}

function isTextFile(filePath: string) {
  const base = path.basename(filePath);
  return TEXT_EXT.has(path.extname(filePath).toLowerCase()) || TEXT_EXT.has(base.toLowerCase());
}

async function tree(dir: string, rel = "", depth = 0): Promise<TreeNode[]> {
  if (depth > 4) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))) {
    if (SKIP.has(entry.name)) continue;
    if (entry.name.startsWith(".") && ![".env", ".env.local", ".gitignore", ".npmrc", ".dashboard-data"].includes(entry.name)) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, path: childRel, type: "dir", children: await tree(full, childRel, depth + 1) });
    } else if (entry.isFile()) {
      const stat = await fs.stat(full).catch(() => null);
      nodes.push({ name: entry.name, path: childRel, type: "file", size: stat?.size || 0 });
    }
  }
  return nodes;
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const action = req.nextUrl.searchParams.get("action") || "tree";
    const target = req.nextUrl.searchParams.get("path") || "";
    const safe = resolveSafe(target);

    if (action === "read") {
      const stat = await fs.stat(safe.full);
      if (!stat.isFile()) return jsonError("not a file", 400);
      if (stat.size > 1024 * 1024) return jsonError("file too large for browser editor", 413);
      if (!isTextFile(safe.full)) return jsonError("binary or unsupported file type", 400);
      const content = await fs.readFile(safe.full, "utf8");
      return NextResponse.json({ ok: true, path: safe.rel, content, size: stat.size });
    }

    const nodes = await tree(safe.base);
    return NextResponse.json({ ok: true, root: safe.base, tree: nodes });
  } catch (error: any) {
    return jsonError(error?.message || "File API failed", authStatus(error));
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const safe = resolveSafe(String(body.path || ""));

    if (action === "write") {
      const content = String(body.content ?? "");
      await fs.mkdir(path.dirname(safe.full), { recursive: true });
      await fs.writeFile(safe.full, content, "utf8");
      return NextResponse.json({ ok: true, path: safe.rel, bytes: Buffer.byteLength(content) });
    }

    if (action === "mkdir") {
      await fs.mkdir(safe.full, { recursive: true });
      return NextResponse.json({ ok: true, path: safe.rel });
    }

    if (action === "delete") {
      if (!safe.rel) return jsonError("cannot delete workspace root", 400);
      await fs.rm(safe.full, { recursive: true, force: true });
      return NextResponse.json({ ok: true, path: safe.rel });
    }

    if (action === "rename") {
      const to = resolveSafe(String(body.to || ""));
      if (!safe.rel || !to.rel) return jsonError("bad rename path", 400);
      await fs.mkdir(path.dirname(to.full), { recursive: true });
      await fs.rename(safe.full, to.full);
      return NextResponse.json({ ok: true, from: safe.rel, to: to.rel });
    }

    return jsonError("unknown file action", 400);
  } catch (error: any) {
    return jsonError(error?.message || "File write failed", authStatus(error));
  }
}
