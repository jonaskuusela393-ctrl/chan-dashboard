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
  const { board } = params;

  let data: CatalogPage[] = [];

  // ✅ SAFE FETCH
  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/catalog.json`,
      {
        next: { revalidate: 60 },
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`4chan HTTP ${res.status}`);
    }

    const json = await res.json();

    // 🔥 IMPORTANT: validate shape
    if (!Array.isArray(json)) {
      throw new Error("Invalid 4chan response format");
    }

    data = json;
  } catch (err) {
    console.error("Board fetch failed:", err);

    return (
      <div className="container">
        <BackButton />
        <h1>/{board}/</h1>
        <p style={{ color: "red" }}>
          Failed to load threads. 4chan API error or blocked.
        </p>
      </div>
    );
  }

  // =========================
  // DB USER
  // =========================
  const user = await getUser();
  const hiddenSet = new Set<string>();

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

  // =========================
  // SAFE FLATTEN
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