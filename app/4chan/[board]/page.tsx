import BackButton from "@/components/BackButton";
import { sql } from "@/lib/db";
import { getUser } from "@/lib/getUser";
import BoardClient from "./BoardClient";

type Thread = {
  no?: number;
  sub?: string;
  replies?: number;
};

type CatalogPage = {
  threads?: Thread[];
};

export default async function BoardPage({
  params,
}: {
  params: Promise<{ board: string }>;
}) {
  const { board } = await params;

  let data: CatalogPage[] = [];

  try {
    const res = await fetch(`https://a.4cdn.org/${board}/catalog.json`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch board: ${res.status}`);
    }

    data = await res.json();
  } catch {
    return (
      <div className="container">
        <BackButton />
        <h1>/{board}/</h1>
        <p style={{ color: "red" }}>
          Failed to load threads. The board may not exist or 4chan API is down.
        </p>
      </div>
    );
  }

  // =========================
  // 🔥 PERSONAL HIDE SYSTEM
  // =========================
  const user = await getUser();

  let hiddenSet = new Set<string>();

  if (user) {
    const hidden = await sql`
      SELECT item_id FROM hidden_items
      WHERE user_id = ${user.id}
      AND item_type = 'thread'
      AND board = ${board}
    `;

    hiddenSet = new Set(hidden.map((h) => String(h.item_id)));
  }

  const threads: Thread[] = Array.isArray(data)
    ? data
        .flatMap((page) => page?.threads ?? [])
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