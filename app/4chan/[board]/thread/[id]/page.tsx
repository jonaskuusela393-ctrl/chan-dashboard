import BackButton from "@/components/BackButton";
import ThreadClient from "./ThreadClient";
import type { Post } from "@/app/types/chan";

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
      console.error("Response body:", text.slice(0, 500));
      throw new Error(`4chan HTTP ${res.status}`);
    }

    let data: ThreadData;

    try {
      data = JSON.parse(text);
    } catch {
      console.error("Expected JSON but got:", text.slice(0, 500));
      throw new Error("4chan returned non-JSON response");
    }

    posts = Array.isArray(data.posts) ? data.posts.filter(isValidPost) : [];
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