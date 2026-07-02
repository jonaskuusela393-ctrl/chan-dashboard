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

type CatalogPage = {
  page?: number;
  threads?: RawThread[];
};

type RawThread = {
  no?: number;
  sub?: string;
  name?: string;
  now?: string;
  time?: number;
  replies?: number;
  images?: number;
  sticky?: number;
  closed?: number;
  com?: string;
  tim?: number;
  ext?: string;
  filename?: string;
  tn_w?: number;
  tn_h?: number;
};

type SafeThread = {
  no: number;
  sub: string;
  name: string;
  now: string;
  time: number;
  replies: number;
  images: number;
  sticky: boolean;
  closed: boolean;
  com: string;
  tim?: number;
  ext?: string;
  filename?: string;
  tn_w?: number;
  tn_h?: number;
  page: number;
};

function cleanBoard(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
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

function normalizeThread(thread: RawThread, pageNumber: number): SafeThread | null {
  const no = cleanNumber(thread.no);

  if (!no) {
    return null;
  }

  const tim = cleanNumber(thread.tim);
  const ext = cleanExt(thread.ext);

  const safeThread: SafeThread = {
    no,
    sub: cleanText(thread.sub),
    name: cleanText(thread.name, "Anonymous") || "Anonymous",
    now: cleanText(thread.now),
    time: cleanNumber(thread.time),
    replies: cleanNumber(thread.replies),
    images: cleanNumber(thread.images),
    sticky: Boolean(thread.sticky),
    closed: Boolean(thread.closed),
    com: cleanHtml(thread.com || ""),
    page: pageNumber,
  };

  if (tim && ext) {
    safeThread.tim = tim;
    safeThread.ext = ext;
    safeThread.filename = cleanText(thread.filename) || String(tim);
    safeThread.tn_w = cleanNumber(thread.tn_w);
    safeThread.tn_h = cleanNumber(thread.tn_h);
  }

  return safeThread;
}

function jsonError(error: string, status = 500) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  const board = cleanBoard(req.nextUrl.searchParams.get("board") || "g");

  if (!board || !BOARDS.has(board)) {
    return jsonError("Bad board", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`https://a.4cdn.org/${board}/catalog.json`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "private-readonly-dashboard/1.0",
      },
      next: {
        revalidate: 15,
      },
    });

    if (!res.ok) {
      return jsonError(`4chan returned ${res.status}`, res.status);
    }

    const data = (await res.json()) as unknown;

    if (!Array.isArray(data)) {
      return jsonError("4chan returned invalid catalog data", 502);
    }

    const threads: SafeThread[] = [];

    for (const page of data as CatalogPage[]) {
      const pageNumber = cleanNumber(page.page);

      if (!Array.isArray(page.threads)) {
        continue;
      }

      for (const rawThread of page.threads) {
        const thread = normalizeThread(rawThread, pageNumber);

        if (thread) {
          threads.push(thread);
        }
      }
    }

    return NextResponse.json(
      {
        board,
        threads,
        count: threads.length,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return jsonError("4chan catalog timed out", 504);
    }

    return jsonError(error?.message || "4chan catalog failed", 500);
  } finally {
    clearTimeout(timeout);
  }
}