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
  params: Promise<{ board: string; id: string }>;
}) {
  const { board, id } = await params;

  let data: ThreadData | null = null;

  try {
    const res = await fetch(
      `https://a.4cdn.org/${board}/thread/${id}.json`,
      {
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) throw new Error("Thread not found");

    data = await res.json();
  } catch {
    return (
      <div className="container">
        <BackButton />
        <h1>/{board}/ — thread {id}</h1>
        <p style={{ color: "red" }}>
          Failed to load thread. It may be deleted or archived.
        </p>
      </div>
    );
  }

  const posts: Post[] = Array.isArray(data?.posts) ? data.posts : [];

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