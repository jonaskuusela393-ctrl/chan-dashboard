import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARDS = new Set([
  "a", "b", "c", "d", "e", "f", "g", "gif", "h", "hr", "k", "m", "o", "p",
  "r", "s", "t", "u", "v", "vg", "vm", "vmg", "vr", "vrpg", "vst", "w",
  "wg", "i", "ic", "r9k", "s4s", "vip", "qa", "cm", "hm", "lgbt", "y",
  "3", "aco", "adv", "an", "bant", "biz", "cgl", "ck", "co", "diy", "fa",
  "fit", "gd", "hc", "his", "int", "jp", "lit", "mlp", "mu", "n", "news",
  "out", "po", "pol", "pw", "qst", "sci", "soc", "sp", "tg", "toy", "trv",
  "tv", "vp", "vt", "wsg", "wsr", "x", "xs"
]);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const board = url.searchParams.get("board") || "";
  const tim = url.searchParams.get("tim") || "";
  const ext = url.searchParams.get("ext") || "";

  if (!BOARDS.has(board)) {
    return NextResponse.json({ error: "bad board" }, { status: 400 });
  }

  if (!/^\d+$/.test(tim)) {
    return NextResponse.json({ error: "bad tim" }, { status: 400 });
  }

  if (!/^\.(jpg|jpeg|png|gif|webm|mp4)$/i.test(ext)) {
    return NextResponse.json({ error: "bad ext" }, { status: 400 });
  }

  const imageUrl = `https://i.4cdn.org/${board}/${tim}${ext}`;

  const res = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
  });

  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "image fetch failed" }, { status: res.status });
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}