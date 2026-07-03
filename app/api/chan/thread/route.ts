import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { isBoardBlocked } from "@/lib/db";
import { cleanBoard, cleanExt, validBoard } from "@/lib/chan";
import { cleanHtml } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(value: unknown, fallback = 0) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function str(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req);
    const board = cleanBoard(req.nextUrl.searchParams.get("board") || "g");
    const no = String(req.nextUrl.searchParams.get("no") || "").trim();
    if (!validBoard(board) || !/^\d{1,20}$/.test(no)) return jsonError("Bad board or thread id", 400);
    if (await isBoardBlocked(session.username, board)) return jsonError(`/${board}/ is disabled for your account.`, 403);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`https://a.4cdn.org/${board}/thread/${no}.json`, { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "private-terminal-viewport/1.0" }, next: { revalidate: 15 } });
      if (!res.ok) return jsonError(`4chan returned ${res.status}`, res.status);
      const data = await res.json();
      if (!Array.isArray(data.posts)) return jsonError("4chan returned invalid thread", 502);
      const posts = data.posts.map((p: any) => {
        const ext = cleanExt(p.ext);
        const tim = num(p.tim);
        return {
          no: num(p.no), resto: num(p.resto), sub: str(p.sub), name: str(p.name, "Anonymous") || "Anonymous", now: str(p.now), time: num(p.time), com: cleanHtml(p.com || ""),
          ...(tim && ext ? { tim, ext, filename: str(p.filename) || String(tim), fsize: num(p.fsize), w: num(p.w), h: num(p.h) } : {})
        };
      }).filter((p: any) => p.no);
      return NextResponse.json({ ok: true, board, no, posts, count: posts.length });
    } finally { clearTimeout(timeout); }
  } catch (error: any) {
    return jsonError(error?.name === "AbortError" ? "4chan timed out" : error?.message || "Thread failed", error?.message === "Not logged in" ? 401 : 500);
  }
}
