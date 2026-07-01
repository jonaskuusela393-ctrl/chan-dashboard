import { NextRequest, NextResponse } from "next/server";
import { cleanHtml } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validBoard(board: string) {
  return /^[a-z0-9]{1,10}$/i.test(board);
}
function validNo(no: string) {
  return /^[0-9]{1,20}$/.test(no);
}

export async function GET(req: NextRequest) {
  const board = (req.nextUrl.searchParams.get("board") || "g").toLowerCase();
  const no = req.nextUrl.searchParams.get("no") || "";
  if (!validBoard(board) || !validNo(no)) return NextResponse.json({ error: "Bad board or thread id" }, { status: 400 });

  const res = await fetch(`https://a.4cdn.org/${board}/thread/${no}.json`, {
    headers: { "User-Agent": "private-readonly-dashboard/1.0" },
    next: { revalidate: 15 }
  });
  if (!res.ok) return NextResponse.json({ error: `4chan returned ${res.status}` }, { status: res.status });

  const data = await res.json();
  const posts = (data.posts || []).map((p: any) => ({
    no: p.no,
    resto: p.resto,
    sub: p.sub || "",
    name: p.name || "Anonymous",
    now: p.now || "",
    time: p.time || 0,
    com: cleanHtml(p.com || ""),
    tim: p.tim,
    ext: p.ext,
    filename: p.filename,
    fsize: p.fsize,
    w: p.w,
    h: p.h,
    tn_w: p.tn_w,
    tn_h: p.tn_h
  }));

  return NextResponse.json({ board, no, posts });
}
