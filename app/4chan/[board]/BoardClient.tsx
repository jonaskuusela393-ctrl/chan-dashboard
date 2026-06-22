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
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  async function hideThread(threadId: number) {
    if (!threadId) return;

    setLoadingId(threadId);

    const previous = threads;

    // optimistic UI update
    setThreads((prev) => prev.filter((t) => t.no !== threadId));

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

      // rollback if API fails
      setThreads(previous);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 12,
        marginTop: 16,
      }}
    >
      {threads.map((t) => {
        const id = t.no;
        if (!id) return null;

        return (
          <div
            key={id}
            className="card"
            style={{ position: "relative" }}
          >
            <Link
              href={`/4chan/${board}/thread/${id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div className="title">
                {t.sub?.trim() || "No title"}
              </div>

              <div className="meta">
                replies: {t.replies ?? 0}
              </div>
            </Link>

            <button
              onClick={() => hideThread(id)}
              disabled={loadingId === id}
              style={{
                marginTop: 8,
                fontSize: 12,
                background: "#111",
                border: "1px solid #333",
                color: "white",
                cursor: "pointer",
                opacity: loadingId === id ? 0.5 : 1,
              }}
            >
              {loadingId === id ? "Hiding..." : "Hide"}
            </button>
          </div>
        );
      })}
    </div>
  );
}