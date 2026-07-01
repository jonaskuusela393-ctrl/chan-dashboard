"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Thread = {
  no?: number;
  sub?: string;
  replies?: number;
};

type ValidThread = Thread & {
  no: number;
};

function isValidThread(thread: Thread | null | undefined): thread is ValidThread {
  return Boolean(thread && typeof thread.no === "number");
}

export default function BoardClient({
  board,
  threads: initialThreads,
}: {
  board: string;
  threads: Thread[];
}) {
  const [threads, setThreads] = useState<Thread[]>(
    Array.isArray(initialThreads) ? initialThreads : []
  );

  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const safeThreads = useMemo(
    () => (Array.isArray(threads) ? threads.filter(isValidThread) : []),
    [threads]
  );

  async function hideThread(threadId: number) {
    setLoadingId(threadId);
    setError(null);

    const previous = threads;

    setThreads((prev) =>
      Array.isArray(prev) ? prev.filter((t) => t?.no !== threadId) : []
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
        const errorText = await res.text();
        throw new Error(`Failed to hide thread: ${res.status} ${errorText}`);
      }
    } catch (err) {
      console.error("Hide thread error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to save hidden thread."
      );

      setThreads(Array.isArray(previous) ? previous : []);
    } finally {
      setLoadingId(null);
    }
  }

  if (safeThreads.length === 0) {
    return (
      <div style={{ marginTop: 16 }}>
        {error && (
          <p style={{ color: "red", fontSize: 12 }}>
            {error}
          </p>
        )}

        <p style={{ opacity: 0.7 }}>No threads found.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p style={{ color: "red", fontSize: 12, marginTop: 12 }}>
          {error}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        {safeThreads.map((thread) => {
          const isLoading = loadingId === thread.no;

          const title =
            typeof thread.sub === "string" && thread.sub.trim()
              ? thread.sub.trim()
              : "No title";

          const replies =
            typeof thread.replies === "number" ? thread.replies : 0;

          return (
            <div
              key={thread.no}
              className="card"
              style={{
                position: "relative",
                opacity: isLoading ? 0.7 : 1,
                paddingRight: 42,
              }}
            >
              <button
                onClick={() => hideThread(thread.no)}
                disabled={isLoading}
                title="Hide thread"
                aria-label={`Hide thread ${thread.no}`}
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
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                ×
              </button>

              <Link
                href={`/4chan/${board}/thread/${thread.no}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  pointerEvents: isLoading ? "none" : "auto",
                }}
              >
                <div className="title">{title}</div>

                <div className="meta">
                  replies: {replies}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}