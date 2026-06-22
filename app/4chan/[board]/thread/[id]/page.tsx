import { neon } from "@neondatabase/serverless";
import BackButton from "@/components/BackButton";
import ThreadClient from "./ThreadClient";
import type { Post } from "@/app/types/chan";

export const runtime = "nodejs";

type ThreadData = {
  posts?: Post[];
};

type ThreadPageProps = {
  params: Promise<{
    board: string;
    id: string;
  }>;
};

function isValidPost(post: unknown): post is Post {
  return (
    typeof post === "object" &&
    post !== null &&
    "no" in post &&
    typeof (post as Post).no === "number"
  );
}

async function getHiddenPostIds(board: string) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn("DATABASE_URL missing, hidden posts will not be filtered.");
    return new Set<number>();
  }

  try {
    const sql = neon(databaseUrl);

    await sql`
      CREATE TABLE IF NOT EXISTS hidden_items (
        id BIGSERIAL PRIMARY KEY,
        item_id BIGINT NOT NULL,
        item_type TEXT NOT NULL,
        board TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT hidden_items_unique UNIQUE (item_id, item_type, board)
      )
    `;

    const rows = await sql`
      SELECT item_id
      FROM hidden_items
      WHERE board = ${board}
      AND item_type = 'post'
    `;

    return new Set(rows.map((row) => Number(row.item_id)));
  } catch (err) {
    console.error("Failed to load hidden posts:", err);
    return new Set<number>();
  }
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { board, id } = await params;

  let posts: Post[] = [];

  try {
    const url = `https://a.4cdn.org/${board}/thread/${id}.json`;

    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: {
        Accept: "application/json",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("4chan HTTP error:", res.status);
      console.error("4chan response:", text.slice(0, 500));
      throw new Error(`4chan HTTP ${res.status}`);
    }

    let data: ThreadData;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("Expected JSON but got:", text.slice(0, 500));
      throw new Error("4chan returned non-JSON response");
    }

    const hiddenPostIds = await getHiddenPostIds(board);

    posts = Array.isArray(data.posts)
      ? data.posts
          .filter(isValidPost)
          .filter((post) => !hiddenPostIds.has(post.no))
      : [];
  } catch (err) {
    console.error("Thread fetch failed:", err);

    return (
      <div className="container">
        <BackButton />

        <h1>
          /{board}/ — thread {id}
        </h1>

        <p style={{ color: "red" }}>
          Failed to load thread. API error, rate limit, or thread deleted.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <BackButton />

      <h1>
        /{board}/ — thread {id}
      </h1>

      <ThreadClient board={board} initialPosts={posts} />
    </div>
  );
}