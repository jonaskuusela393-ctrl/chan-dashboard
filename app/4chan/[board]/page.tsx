import BackButton from "@/components/BackButton";
import { sql } from "@/lib/db";
import BoardClient from "./BoardClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Thread = {
  no: number;
  sub?: string;
  com?: string;
  tim?: number;
  ext?: string;
  filename?: string;
  replies?: number;
  images?: number;
};

type CatalogPage = {
  page?: number;
  threads?: Thread[];
};

type BoardPageProps = {
  params: Promise<{
    board: string;
  }>;
};

function isValidBoard(board: string) {
  return /^[a-z0-9]+$/i.test(board);
}

function isThread(value: unknown): value is Thread {
  return (
    typeof value === "object" &&
    value !== null &&
    "no" in value &&
    typeof (value as Thread).no === "number"
  );
}

function isCatalogPage(value: unknown): value is CatalogPage {
  return (
    typeof value === "object" &&
    value !== null &&
    "threads" in value &&
    Array.isArray((value as CatalogPage).threads)
  );
}

async function getHiddenThreadIds(board: string) {
  const hiddenSet = new Set<string>();

  try {
    const hidden = await sql`
      SELECT item_id
      FROM hidden_items
      WHERE item_type = 'thread'
      AND board = ${board}
      AND created_at >= NOW() - INTERVAL '7 days'
    `;

    for (const h of hidden as { item_id: string | number }[]) {
      hiddenSet.add(String(h.item_id));
    }
  } catch (err) {
    console.warn("Hidden thread DB check failed, continuing page:", err);
  }

  return hiddenSet;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { board } = await params;

  if (!board || !isValidBoard(board)) {
    return (
      <div className="container">
        <BackButton />
        <p>Invalid board</p>
      </div>
    );
  }

  let data: CatalogPage[] = [];

  try {
    const res = await fetch(`https://a.4cdn.org/${board}/catalog.json`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`4chan HTTP ${res.status}: ${text.slice(0, 120)}`);
    }

    let json: unknown;

    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("4chan returned invalid JSON, likely HTML or block page");
    }

    if (!Array.isArray(json)) {
      throw new Error("Invalid 4chan catalog structure");
    }

    data = json.filter(isCatalogPage);
  } catch (err) {
    console.error("4chan fetch failed:", err);

    return (
      <div className="container">
        <BackButton />

        <h1>/{board}/</h1>

        <p style={{ color: "red" }}>
          Failed to load threads (API unavailable or blocked)
        </p>
      </div>
    );
  }

  const hiddenSet = await getHiddenThreadIds(board);

  const threads = data
    .flatMap((page) => page.threads ?? [])
    .filter(isThread)
    .filter((thread) => !hiddenSet.has(String(thread.no)));

  return (
    <div className="container">
      <BackButton />

      <h1>/{board}/</h1>

      <BoardClient board={board} threads={threads} />
    </div>
  );
}