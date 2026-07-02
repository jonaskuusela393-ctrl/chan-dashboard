import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARDS = new Set([
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "gif",
  "h",
  "hr",
  "k",
  "m",
  "o",
  "p",
  "r",
  "s",
  "t",
  "u",
  "v",
  "vg",
  "vm",
  "vmg",
  "vr",
  "vrpg",
  "vst",
  "w",
  "wg",
  "i",
  "ic",
  "r9k",
  "s4s",
  "vip",
  "qa",
  "cm",
  "hm",
  "lgbt",
  "y",
  "3",
  "aco",
  "adv",
  "an",
  "bant",
  "biz",
  "cgl",
  "ck",
  "co",
  "diy",
  "fa",
  "fit",
  "gd",
  "hc",
  "his",
  "int",
  "jp",
  "lit",
  "mlp",
  "mu",
  "n",
  "news",
  "out",
  "po",
  "pol",
  "pw",
  "qst",
  "sci",
  "soc",
  "sp",
  "tg",
  "toy",
  "trv",
  "tv",
  "vp",
  "vt",
  "wsg",
  "wsr",
  "x",
  "xs",
]);

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

function cleanBoard(value: string) {
  return value.trim().toLowerCase();
}

function cleanExt(value: string) {
  const ext = value.trim().toLowerCase();
  return ext.startsWith(".") ? ext : `.${ext}`;
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const board = cleanBoard(url.searchParams.get("board") || "");
  const tim = (url.searchParams.get("tim") || "").trim();
  const ext = cleanExt(url.searchParams.get("ext") || "");

  if (!BOARDS.has(board)) {
    return jsonError("bad board", 400);
  }

  if (!/^\d+$/.test(tim)) {
    return jsonError("bad tim", 400);
  }

  if (!CONTENT_TYPES[ext]) {
    return jsonError("bad ext", 400);
  }

  const upstreamUrl = `https://i.4cdn.org/${board}/${tim}${ext}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        Accept: `${CONTENT_TYPES[ext]},image/*,video/*,*/*;q=0.8`,
        Referer: `https://boards.4chan.org/${board}/`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.redirect(upstreamUrl, 302);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || CONTENT_TYPES[ext],
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.redirect(upstreamUrl, 302);
  }
}