import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { isBoardBlocked } from "@/lib/db";
import { cleanBoard, validBoard } from "@/lib/chan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webm": "video/webm", ".mp4": "video/mp4" };
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req);
    const board = cleanBoard(req.nextUrl.searchParams.get("board") || "");
    const tim = String(req.nextUrl.searchParams.get("tim") || "").trim();
    const ext = String(req.nextUrl.searchParams.get("ext") || "").trim().toLowerCase();
    if (!validBoard(board)) return jsonError("Bad board", 400);
    if (await isBoardBlocked(session.username, board)) return jsonError(`/${board}/ is disabled for your account.`, 403);
    if (!/^\d+$/.test(tim)) return jsonError("Bad media id", 400);
    if (!TYPES[ext]) return jsonError("Bad extension", 400);
    const upstreamUrl = `https://i.4cdn.org/${board}/${tim}${ext}`;
    const upstream = await fetch(upstreamUrl, { cache: "no-store", headers: { Accept: `${TYPES[ext]},image/*,video/*,*/*`, Referer: `https://boards.4chan.org/${board}/`, "User-Agent": "private-terminal-viewport/1.0" } });
    if (!upstream.ok || !upstream.body) return NextResponse.redirect(upstreamUrl, 302);
    return new NextResponse(upstream.body, { status: 200, headers: { "Content-Type": upstream.headers.get("content-type") || TYPES[ext], "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch (error: any) {
    return jsonError(error?.message || "Image failed", error?.message === "Not logged in" ? 401 : 500);
  }
}
