import BackButton from "@/components/BackButton";
import { sql } from "@/lib/db";
import { getUser } from "@/lib/getUser";
import BoardClient from "./BoardClient";

type Thread = {
  no: number;
  sub?: string;
  replies?: number;
};

type CatalogPage = {
  page: number;
  threads: Thread[];
};

export default async function BoardPage({
  params,
}: {
  params: { board: string };
}) {
  const board = params?.board;

  if (!board || typeof board !== "string") {
    return (
      <div className="container">
        <BackButton />
        <p>Invalid board</p>
      </div>
    );
  }

  // =========================
  // FETCH 4CHAN (SAFE)
  // =========================
  let data: CatalogPage[] = [];

  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/catalog.json`,
      {
        next: { revalidate: 60 },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "application/json,text/plain,*/*",
        },
      }
    );

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`4chan HTTP ${res.status}: ${text.slice(0, 120)}`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("4chan returned non-JSON (blocked or HTML)");
    }

    if (!Array.isArray(json)) {
      throw new Error("Invalid 4chan catalog format");
    }

    data = json;
  } catch (err) {
    console.error("4chan fetch failed:", err);

    return (
      <div className="container">
        <BackButton />
        <h1>/{board}/</h1>
        <p style={{ color: "red" }}>
          Failed to load threads (API blocked or unavailable)
        </p>
      </div>
    );
  }

  // =========================
  // DB (SAFE - DOES NOT BREAK PAGE)
  // =========================
  let hiddenSet = new Set<string>();

  try {
    const user = await getUser();

    if (user) {
      const hidden = await sql`
        SELECT item_id
        FROM hidden_items
        WHERE user_id = ${user.id}
          AND item_type = 'thread'
          AND board = ${board}
      `;

      for (const h of hidden as { item_id: string | number }[]) {
        hiddenSet.add(String(h.item_id));
      }
    }
  } catch (e) {
    console.warn("DB failed but continuing page:", e);
  }

  // =========================
  // FLATTEN THREADS SAFELY
  // =========================
  const threads = Array.isArray(data)
    ? data
        .flatMap((p) => p?.threads ?? [])
        .filter((t) => t?.no && !hiddenSet.has(String(t.no)))
    : [];

  return (
    <div className="container">
      <BackButton />
      <h1>/{board}/</h1>

      <BoardClient board={board} threads={threads} />
    </div>
  );
}