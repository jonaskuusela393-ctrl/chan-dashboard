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
  const [threads, setThreads] = useState(initialThreads);

  async function hideThread(threadId?: number) {
    if (!threadId) return;

    await fetch("/api/hide", {
      method: "POST",
      body: JSON.stringify({
        itemId: threadId,
        itemType: "thread",
        board,
      }),
    });

    // 🔥 instant UI update (NO reload)
    setThreads((prev) => prev.filter((t) => t.no !== threadId));
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
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="title">
                {t.sub?.trim() || "No title"}
              </div>

              <div className="meta">
                replies: {t.replies ?? 0}
              </div>
            </Link>

            {/* 🔥 HIDE BUTTON */}
            <button
              onClick={() => hideThread(id)}
              style={{
                marginTop: 8,
                fontSize: 12,
                background: "#111",
                border: "1px solid #333",
                color: "white",
                cursor: "pointer",
              }}
            >
              Hide
            </button>
          </div>
        );
      })}
    </div>
  );
}