"use client";

import { useState } from "react";
import sanitizeHtml from "sanitize-html";
import type { Post } from "@/app/types/chan";

type ThreadClientProps = {
  board: string;
  initialPosts: Post[];
};

function cleanHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "a",
      "br",
      "span",
      "p",
      "b",
      "i",
      "em",
      "strong",
      "s",
      "u",
      "wbr",
      "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "class", "target", "rel"],
      span: ["class"],
      p: ["class"],
      blockquote: ["class"],
    },
    allowedSchemes: ["http", "https"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noreferrer",
      }),
    },
  });
}

export default function ThreadClient({
  board,
  initialPosts,
}: ThreadClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function hidePost(postId: number) {
    setLoadingId(postId);

    const previous = posts;

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
        throw new Error(`Failed to hide post: ${res.status}`);
      }
    } catch (err) {
      console.error("Hide post failed:", err);
      setPosts(previous);
    } finally {
      setLoadingId(null);
    }
  }

  if (!posts.length) {
    return <p>No posts found.</p>;
  }

  return (
    <div>
      {posts.map((p, index) => {
        const isOP = index === 0;

        const imageUrl =
          p.tim && p.ext
            ? `https://i.4cdn.org/${board}/${p.tim}${p.ext}`
            : null;

        const imageFileName = p.tim && p.ext ? `${p.tim}${p.ext}` : null;

        return (
          <div
            key={p.no}
            className="card"
            style={{
              borderColor: isOP ? "#666" : "#222",
            }}
          >
            <div className="meta">
              No.{p.no} {isOP && "• OP"}
            </div>

            {p.sub && <h2>{p.sub}</h2>}

            {imageUrl && imageFileName && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  marginBottom: 8,
                  fontSize: 12,
                  color: "#9cf",
                  textDecoration: "underline",
                }}
              >
                {imageFileName}
              </a>
            )}

            {p.com && (
              <div
                className="post-body"
                dangerouslySetInnerHTML={{
                  __html: cleanHtml(p.com),
                }}
              />
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
                cursor: loadingId === p.no ? "not-allowed" : "pointer",
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