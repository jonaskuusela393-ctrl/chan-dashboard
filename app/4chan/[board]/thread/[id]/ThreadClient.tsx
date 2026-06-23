"use client";

import { useState } from "react";
import sanitizeHtml from "sanitize-html";
import type { Post } from "@/app/types/chan";

type ThreadPost = Post & {
  no: number;
  sub?: string;
  com?: string;
  tim?: number;
  ext?: string;
  filename?: string;
};

type ThreadClientProps = {
  board: string;
  initialPosts: ThreadPost[];
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
        target: "_blank",
        rel: "noreferrer",
      }),
    },
  });
}

export default function ThreadClient({
  board,
  initialPosts,
}: ThreadClientProps) {
  const [posts, setPosts] = useState<ThreadPost[]>(
    Array.isArray(initialPosts) ? initialPosts : []
  );

  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hidePost(postId: number) {
    if (loadingId !== null) return;

    setLoadingId(postId);
    setError(null);

    const previousPosts = posts;

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
        const errorText = await res.text();
        throw new Error(`Failed to hide post: ${res.status} ${errorText}`);
      }
    } catch (err) {
      console.error("Hide post failed:", err);

      setError(
        err instanceof Error ? err.message : "Failed to save hidden post."
      );

      setPosts(previousPosts);
    } finally {
      setLoadingId(null);
    }
  }

  if (!posts.length) {
    return (
      <div>
        {error && (
          <p style={{ color: "red", fontSize: 12 }}>
            {error}
          </p>
        )}

        <p>No posts found.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p style={{ color: "red", fontSize: 12 }}>
          {error}
        </p>
      )}

      {posts.map((post, index) => {
        const isOP = index === 0;
        const isLoading = loadingId === post.no;

        const imageUrl =
          post.tim && post.ext
            ? `https://i.4cdn.org/${board}/${post.tim}${post.ext}`
            : null;

        const imageFileName =
          post.tim && post.ext ? `${post.tim}${post.ext}` : null;

        return (
          <div
            key={post.no}
            className="card"
            style={{
              position: "relative",
              borderColor: isOP ? "#666" : "#222",
              paddingRight: 42,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <button
              onClick={() => hidePost(post.no)}
              disabled={loadingId !== null}
              title="Hide post"
              aria-label={`Hide post ${post.no}`}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: 999,
                background: "#111",
                border: "1px solid #333",
                color: "white",
                fontSize: 18,
                lineHeight: "24px",
                textAlign: "center",
                opacity: isLoading ? 0.5 : 1,
                cursor: loadingId !== null ? "not-allowed" : "pointer",
              }}
            >
              ×
            </button>

            <div className="meta">
              No.{post.no} {isOP && "• OP"}
            </div>

            {post.sub && <h2>{post.sub}</h2>}

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
                  wordBreak: "break-all",
                }}
              >
                {imageFileName}
              </a>
            )}

            {post.com && (
              <div
                className="post-body"
                dangerouslySetInnerHTML={{
                  __html: cleanHtml(post.com),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}