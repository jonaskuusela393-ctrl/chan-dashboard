import { NextRequest, NextResponse } from "next/server";
import { cleanHtml } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validBoard(board: string) {
  return /^[a-z0-9]{1,10}$/i.test(board);
}

export async function GET(req: NextRequest) {
  const board = (req.nextUrl.searchParams.get("board") || "g").toLowerCase();
  if (!validBoard(board)) return NextResponse.json({ error: "Bad board" }, { status: 400 });

  const res = await fetch(`https://a.4cdn.org/${board}/catalog.json`, {
    headers: { "User-Agent": "private-readonly-dashboard/1.0" },
    next: { revalidate: 15 }
  });
  if (!res.ok) return NextResponse.json({ error: `4chan returned ${res.status}` }, { status: res.status });

  const pages = await res.json();
  const threads = pages.flatMap((page: any) => (page.threads || []).map((t: any) => ({
    no: t.no,
    sub: t.sub || "",
    name: t.name || "Anonymous",
    now: t.now || "",
    time: t.time || 0,
    replies: t.replies || 0,
    images: t.images || 0,
    sticky: Boolean(t.sticky),
    closed: Boolean(t.closed),
    com: cleanHtml(t.com || ""),
    tim: t.tim,
    ext: t.ext,
    filename: t.filename,
    tn_w: t.tn_w,
    tn_h: t.tn_h,
    page: page.page
  })));

  return NextResponse.json({ board, threads });
}
