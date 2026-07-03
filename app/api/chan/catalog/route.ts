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
    if (!validBoard(board)) return jsonError("Bad board", 400);
    if (await isBoardBlocked(session.username, board)) return jsonError(`/${board}/ is disabled for your account.`, 403);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`https://a.4cdn.org/${board}/catalog.json`, { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "private-terminal-viewport/1.0" }, next: { revalidate: 15 } });
      if (!res.ok) return jsonError(`4chan returned ${res.status}`, res.status);
      const pages = await res.json();
      if (!Array.isArray(pages)) return jsonError("4chan returned invalid catalog", 502);
      const threads = pages.flatMap((page: any) => Array.isArray(page.threads) ? page.threads.map((t: any) => {
        const ext = cleanExt(t.ext);
        const tim = num(t.tim);
        return {
          no: num(t.no), sub: str(t.sub), name: str(t.name, "Anonymous") || "Anonymous", now: str(t.now), time: num(t.time), replies: num(t.replies), images: num(t.images), sticky: Boolean(t.sticky), closed: Boolean(t.closed), com: cleanHtml(t.com || ""), page: num(page.page),
          ...(tim && ext ? { tim, ext, filename: str(t.filename) || String(tim) } : {})
        };
      }).filter((t: any) => t.no) : []);
      return NextResponse.json({ ok: true, board, threads, count: threads.length });
    } finally { clearTimeout(timeout); }
  } catch (error: any) {
    return jsonError(error?.name === "AbortError" ? "4chan timed out" : error?.message || "Catalog failed", error?.message === "Not logged in" ? 401 : 500);
  }
}
