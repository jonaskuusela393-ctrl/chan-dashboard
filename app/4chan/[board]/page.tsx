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
  page?: number;
  threads?: Thread[];
};

export default async function BoardPage({
  params,
}: {
  params: { board: string };
}) {
  const { board } = params;

  let data: CatalogPage[] = [];

  // =========================
  // FETCH VIA PROXY (FIX)
  // =========================
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/4chan/${board}`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      throw new Error(`Proxy HTTP ${res.status}`);
    }

    data = await res.json();
  } catch (err) {
    console.error("❌ Failed to fetch board:", err);

    return (
      <div className="container">
        <BackButton />
        <h1>/{board}/</h1>

        <p style={{ color: "red" }}>
          Failed to load threads. API proxy error or server issue.
        </p>
      </div>
    );
  }

  // =========================
  // USER + HIDDEN THREADS
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

    for (const h of hidden as any[]) {
      hiddenSet.add(String(h.item_id));
    }
  }

  // =========================
  // FLATTEN THREADS SAFELY
  // =========================
  const threads: Thread[] = Array.isArray(data)
    ? data
        .flatMap((page) => page?.threads ?? [])
        .filter(
          (t) =>
            typeof t?.no === "number" &&
            !hiddenSet.has(String(t.no))
        )
    : [];

  return (
    <div className="container">
      <BackButton />
      <h1>/{board}/</h1>

      <BoardClient board={board} threads={threads} />
    </div>
  );
}