import BackButton from "@/components/BackButton";
import ThreadClient from "./ThreadClient";
import type { Post } from "@/app/types/chan";

type ThreadData = {
  posts?: Post[];
};

export default async function ThreadPage({
  params,
}: {
  params: { board: string; id: string };
}) {
  const { board, id } = params;

  let posts: Post[] = [];

  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/thread/${id}.json`,
      {
        next: { revalidate: 30 },
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`4chan HTTP ${res.status}`);
    }

    const data: ThreadData = await res.json();

    // ✅ SAFE + STRICT FILTER (prevents runtime crashes)
    posts = Array.isArray(data?.posts)
      ? data.posts.filter((p): p is Post => typeof p?.no === "number")
      : [];
  } catch (err) {
    console.error("Thread fetch failed:", err);

    return (
      <div className="container">
        <BackButton />
        <h1>/{board}/ — thread {id}</h1>

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