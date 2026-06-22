import BackButton from "@/components/BackButton";
import ThreadClient from "./ThreadClient";

type Post = {
  no?: number;
  tim?: number;
  ext?: string;
  com?: string;
};

type ThreadData = {
  posts?: Post[];
};

export default async function ThreadPage({
  params,
}: {
  params: { board: string; id: string };
}) {
  const { board, id } = params;

  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/thread/${id}.json`,
      {
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) {
      throw new Error(`4chan HTTP ${res.status}`);
    }

    const data: ThreadData = await res.json();

    const posts: Post[] = Array.isArray(data?.posts)
      ? data.posts
      : [];

    return (
      <div className="container">
        <BackButton />
        <h1>/{board}/ — thread {id}</h1>

        <ThreadClient board={board} initialPosts={posts} />
      </div>
    );
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
}