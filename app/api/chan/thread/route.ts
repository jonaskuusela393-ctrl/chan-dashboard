import { NextRequest, NextResponse } from "next/server";
import { cleanHtml } from "@/lib/sanitize";

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

type RawPost = {
  no?: number;
  resto?: number;
  sub?: string;
  name?: string;
  now?: string;
  time?: number;
  com?: string;
  tim?: number;
  ext?: string;
  filename?: string;
  fsize?: number;
  w?: number;
  h?: number;
  tn_w?: number;
  tn_h?: number;
};

type ThreadData = {
  posts?: RawPost[];
};

type SafePost = {
  no: number;
  resto: number;
  sub: string;
  name: string;
  now: string;
  time: number;
  com: string;
  tim?: number;
  ext?: string;
  filename?: string;
  fsize?: number;
  w?: number;
  h?: number;
  tn_w?: number;
  tn_h?: number;
};

function cleanBoard(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

function validThreadNo(value: string) {
  return /^[0-9]{1,20}$/.test(value);
}

function cleanExt(value: unknown) {
  if (typeof value !== "string") return undefined;

  const ext = value.trim().toLowerCase();

  if (!/^\.(jpg|jpeg|png|gif|webm|mp4)$/.test(ext)) {
    return undefined;
  }

  return ext;
}

function cleanNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizePost(post: RawPost): SafePost | null {
  const no = cleanNumber(post.no);

  if (!no) {
    return null;
  }

  const tim = cleanNumber(post.tim);
  const ext = cleanExt(post.ext);

  const safePost: SafePost = {
    no,
    resto: cleanNumber(post.resto),
    sub: cleanText(post.sub),
    name: cleanText(post.name, "Anonymous") || "Anonymous",
    now: cleanText(post.now),
    time: cleanNumber(post.time),
    com: cleanHtml(post.com || ""),
  };

  if (tim && ext) {
    safePost.tim = tim;
    safePost.ext = ext;
    safePost.filename = cleanText(post.filename) || String(tim);
    safePost.fsize = cleanNumber(post.fsize);
    safePost.w = cleanNumber(post.w);
    safePost.h = cleanNumber(post.h);
    safePost.tn_w = cleanNumber(post.tn_w);
    safePost.tn_h = cleanNumber(post.tn_h);
  }

  return safePost;
}

function jsonError(error: string, status = 500) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  const board = cleanBoard(req.nextUrl.searchParams.get("board") || "g");
  const no = (req.nextUrl.searchParams.get("no") || "").trim();

  if (!board || !BOARDS.has(board) || !validThreadNo(no)) {
    return jsonError("Bad board or thread id", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`https://a.4cdn.org/${board}/thread/${no}.json`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "private-readonly-dashboard/1.0",
      },
      next: {
        revalidate: 15,
      },
    });

    if (!response.ok) {
      return jsonError(`4chan returned ${response.status}`, response.status);
    }

    const data = (await response.json()) as ThreadData;

    if (!data || !Array.isArray(data.posts)) {
      return jsonError("4chan returned invalid thread data", 502);
    }

    const posts = data.posts
      .map((post) => normalizePost(post))
      .filter((post): post is SafePost => Boolean(post));

    return NextResponse.json(
      {
        board,
        no,
        posts,
        count: posts.length,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return jsonError("4chan thread timed out", 504);
    }

    return jsonError(error?.message || "4chan thread failed", 500);
  } finally {
    clearTimeout(timeout);
  }
}