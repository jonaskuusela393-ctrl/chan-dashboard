"use client";

import { useState } from "react";

type Post = {
  no?: number;
  tim?: number;
  ext?: string;
  com?: string;
};

export default function ThreadClient({
  board,
  initialPosts,
}: {
  board: string;
  initialPosts: Post[];
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function hidePost(postId?: number) {
    if (!postId) return;

    setLoadingId(postId);

    const previous = posts;

    // optimistic update
    setPosts((prev) => prev.filter((p) => p.no !== postId));

    try {
      const res = await fetch("/api/hide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: postId,
          itemType: "post",
          board,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to hide post");
      }
    } catch (err) {
      console.error("Hide post failed:", err);

      // rollback UI if API fails
      setPosts(previous);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {posts.map((p, index) => {
        const isOP = index === 0 || p.no === posts[0]?.no;

        const imageUrl =
          p?.tim && p?.ext
            ? `https://i.4cdn.org/${board}/${p.tim}${p.ext}`
            : null;

        return (
          <div
            key={p.no ?? `${index}-${p.tim ?? "no-tim"}`}
            className="card"
            style={{
              borderColor: isOP ? "#666" : "#222",
            }}
          >
            <div className="meta">
              No.{p.no ?? "?"} {isOP && "• OP"}
            </div>

            <div
              className="post-body"
              dangerouslySetInnerHTML={{ __html: p.com ?? "" }}
            />

            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="image-link"
              >
                <img src={imageUrl} className="post-img" alt="" />
              </a>
            )}

            <button
              onClick={() => hidePost(p.no)}
              disabled={loadingId === p.no}
              style={{
                marginTop: 8,
                fontSize: 11,
                background: "#111",
                border: "1px solid #333",
                color: "white",
                cursor: "pointer",
                opacity: loadingId === p.no ? 0.5 : 1,
              }}
            >
              {loadingId === p.no ? "Hiding..." : "Hide post"}
            </button>
          </div>
        );
      })}
    </div>
  );
}