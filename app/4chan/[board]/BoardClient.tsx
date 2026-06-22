"use client";

import { useState } from "react";
import Link from "next/link";

type Thread = {
  no?: number;
  sub?: string;
  replies?: number;
};

export default function BoardClient({
  board,
  threads: initialThreads,
}: {
  board: string;
  threads: Thread[];
}) {
  // ✅ GUARANTEE ARRAY SAFETY
  const [threads, setThreads] = useState<Thread[]>(
    Array.isArray(initialThreads) ? initialThreads : []
  );

  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function hideThread(threadId?: number) {
    if (typeof threadId !== "number") return;

    setLoadingId(threadId);

    // snapshot (safe rollback)
    const previous = threads;

    // optimistic update (safe)
    setThreads((prev) =>
      Array.isArray(prev)
        ? prev.filter((t) => t?.no !== threadId)
        : []
    );

    try {
      const res = await fetch("/api/hide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: threadId,
          itemType: "thread",
          board,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to hide thread");
      }
    } catch (err) {
      console.error("Hide error:", err);

      // rollback (safe)
      setThreads(Array.isArray(previous) ? previous : []);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 12,
        marginTop: 16,
      }}
    >
      {Array.isArray(threads) &&
        threads
          .filter((t) => t && typeof t.no === "number")
          .map((t) => {
            const isLoading = loadingId === t.no;

            return (
              <div
                key={t.no}
                className="card"
                style={{
                  position: "relative",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                <Link
                  href={`/4chan/${board}/thread/${t.no}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    pointerEvents: isLoading ? "none" : "auto",
                  }}
                >
                  <div className="title">
                    {typeof t.sub === "string" && t.sub.trim()
                      ? t.sub.trim()
                      : "No title"}
                  </div>

                  <div className="meta">
                    replies: {typeof t.replies === "number" ? t.replies : 0}
                  </div>
                </Link>

                <button
                  onClick={() => hideThread(t.no)}
                  disabled={isLoading}
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    background: "#111",
                    border: "1px solid #333",
                    color: "white",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.5 : 1,
                  }}
                >
                  {isLoading ? "Hiding..." : "Hide"}
                </button>
              </div>
            );
          })}
    </div>
  );
}