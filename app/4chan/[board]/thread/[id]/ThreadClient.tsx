"use client";

import { useState } from "react";
import sanitizeHtml from "sanitize-html";
import type { Post } from "@/app/types/chan";

export default function ThreadClient({
  board,
  initialPosts,
}: {
  board: string;
  initialPosts: Post[];
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function hidePost(postId: number) {
    setLoadingId(postId);

    const previous = [...posts];

    setPosts((prev) => prev.filter((p) => p.no !== postId));

    try {
      const res = await fetch("/api/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: postId,
          itemType: "post",
          board,
        }),
      });

      if (!res.ok) throw new Error("Failed to hide post");
    } catch (err) {
      console.error("Hide post failed:", err);
      setPosts(previous);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {posts.map((p, index) => {
        const isOP = index === 0;

        const imageUrl =
          p.tim && p.ext
            ? `https://i.4cdn.org/${board}/${p.tim}${p.ext}`
            : null;

        return (
          <div
            key={p.no}
            className="card"
            style={{ borderColor: isOP ? "#666" : "#222" }}
          >
            <div className="meta">
              No.{p.no} {isOP && "• OP"}
            </div>

            <div
              className="post-body"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(p.com ?? ""),
              }}
            />

            {imageUrl && (
              <a href={imageUrl} target="_blank" rel="noreferrer">
                <img
                  src={imageUrl}
                  className="post-img"
                  alt=""
                  loading="lazy"
                />
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