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

  return NextResponse.redirect(`https://i.4cdn.org/${board}/${tim}${ext}`, 302);
}