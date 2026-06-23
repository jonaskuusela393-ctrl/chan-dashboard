import { neon } from "@neondatabase/serverless";
import BackButton from "@/components/BackButton";
import ThreadClient from "./ThreadClient";
import type { Post } from "@/app/types/chan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ThreadPost = Post & {
  no: number;
};

type ThreadData = {
  posts?: unknown;
};

type ThreadPageProps = {
  params: Promise<{
    board: string;
    id: string;
  }>;
};

function isValidBoard(board: string) {
  return /^[a-z0-9]+$/i.test(board);
}

function isValidThreadId(id: string) {
  return /^\d+$/.test(id);
}

function isValidPost(post: unknown): post is ThreadPost {
  return (
    typeof post === "object" &&
    post !== null &&
    "no" in post &&
    typeof (post as ThreadPost).no === "number"
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
        item_id BIGINT,
        item_type TEXT,
        board TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      DELETE FROM hidden_items
      WHERE created_at < NOW() - INTERVAL '7 days'
    `;

    const rows = (await sql`
      SELECT item_id
      FROM hidden_items
      WHERE board = ${board}
      AND item_type = 'post'
      AND created_at >= NOW() - INTERVAL '7 days'
    `) as { item_id: string | number }[];

    return new Set(
      rows
        .map((row) => Number(row.item_id))
        .filter((id) => Number.isFinite(id))
    );
  } catch (err) {
    console.error("Failed to load hidden posts:", err);
    return new Set<number>();
  }
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { board, id } = await params;

  if (!board || !isValidBoard(board) || !id || !isValidThreadId(id)) {
    return (
      <div className="container">
        <BackButton />
        <p>Invalid thread</p>
      </div>
    );
  }

  let posts: ThreadPost[] = [];

  try {
    const url = `https://a.4cdn.org/${board}/thread/${id}.json`;

    const res = await fetch(url, {
      cache: "no-store",
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
      data = JSON.parse(text) as ThreadData;
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