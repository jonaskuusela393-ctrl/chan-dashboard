"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteForever, loadDeleted } from "@/lib/deletedClient";

type ChanThread = {
  no: number;
  sub: string;
  name: string;
  now: string;
  replies: number;
  images: number;
  com: string;
  tim?: number;
  ext?: string;
  filename?: string;
  page?: number;
  sticky?: boolean;
  closed?: boolean;
};

type ChanPost = ChanThread & {
  resto: number;
  fsize?: number;
  w?: number;
  h?: number;
};

const DELETE_SCOPE = "chan";

function cleanBoard(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

function mediaUrl(board: string, p: { tim?: number; ext?: string }) {
  if (!board || !p.tim || !p.ext) return "";
  return `/api/chan/image?board=${encodeURIComponent(board)}&tim=${encodeURIComponent(
    String(p.tim)
  )}&ext=${encodeURIComponent(p.ext)}`;
}

function threadKey(board: string, no: number) {
  return `thread:${board}:${no}`;
}

function postKey(board: string, no: number) {
  return `post:${board}:${no}`;
}

function openImage(url: string) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ChanPage() {
  const [boardInput, setBoardInput] = useState("g");
  const [activeBoard, setActiveBoard] = useState("g");

  const [threads, setThreads] = useState<ChanThread[]>([]);
  const [selected, setSelected] = useState<ChanThread | null>(null);
  const [posts, setPosts] = useState<ChanPost[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  async function refreshDeleted() {
    try {
      setDeleted(await loadDeleted(DELETE_SCOPE));
    } catch (e: any) {
      setError(e.message || "Could not load database deletes");
    }
  }

  async function loadCatalog(rawBoard = boardInput) {
    const nextBoard = cleanBoard(rawBoard || "g");

    if (!nextBoard) {
      setError("Board is empty");
      return;
    }

    setLoading(true);
    setError("");
    setSelected(null);
    setPosts([]);

    try {
      await refreshDeleted();

      const res = await fetch(
        `/api/chan/catalog?board=${encodeURIComponent(nextBoard)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Catalog failed");
      }

      setActiveBoard(nextBoard);
      setBoardInput(nextBoard);
      setThreads(data.threads || []);
    } catch (e: any) {
      setError(e.message || "Catalog failed");
    } finally {
      setLoading(false);
    }
  }

  async function openThread(t: ChanThread) {
    const board = activeBoard;

    setSelected(t);
    setLoading(true);
    setError("");
    setPosts([]);

    try {
      await refreshDeleted();

      const res = await fetch(
        `/api/chan/thread?board=${encodeURIComponent(board)}&no=${t.no}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Thread failed");
      }

      setPosts(data.posts || []);
    } catch (e: any) {
      setError(e.message || "Thread failed");
    } finally {
      setLoading(false);
    }
  }

  async function removeForever(key: string, label: string) {
    setDeleted((old) => new Set([...old, key]));

    try {
      await deleteForever(DELETE_SCOPE, key, label);
    } catch (e: any) {
      setError(e.message || "Database delete failed");
      await refreshDeleted();
    }
  }

  useEffect(() => {
    loadCatalog("g");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownThreads = useMemo(() => {
    const q = search.trim().toLowerCase();

    return threads
      .filter((t) => !deleted.has(threadKey(activeBoard, t.no)))
      .filter((t) => {
        if (!q) return true;
        return `${t.no} ${t.sub || ""} ${t.name || ""} ${t.com || ""}`
          .toLowerCase()
          .includes(q);
      });
  }, [threads, activeBoard, search, deleted]);

  const shownPosts = useMemo(() => {
    return posts.filter((p) => !deleted.has(postKey(activeBoard, p.no)));
  }, [posts, activeBoard, deleted]);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>4chan viewport</h1>
          <p className="muted">
            Read-only. Delete writes a permanent tombstone to Neon. Images only
            load when you click the filename, so the page does not spam-load
            thumbnails.
          </p>
        </div>
      </div>

      <div className="row panel">
        <input
          value={boardInput}
          onChange={(e) => setBoardInput(cleanBoard(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") loadCatalog(boardInput);
          }}
          placeholder="board, example g"
        />

        <button onClick={() => loadCatalog(boardInput)} disabled={loading}>
          load board
        </button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filter threads"
        />

        <button onClick={refreshDeleted}>reload deletes</button>

        <span className="muted small">loaded /{activeBoard}/</span>

        {loading && <span className="muted">loading...</span>}

        {error && (
          <span className="small" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        )}
      </div>

      <div className="two">
        <section className="stack">
          {shownThreads.map((t) => {
            const full = mediaUrl(activeBoard, t);

            return (
              <article className="thread" key={t.no}>
                <div className="spread">
                  <button onClick={() => openThread(t)}>#{t.no}</button>

                  <button
                    className="danger"
                    onClick={() =>
                      removeForever(
                        threadKey(activeBoard, t.no),
                        `${activeBoard} thread ${t.no}`
                      )
                    }
                  >
                    delete forever
                  </button>
                </div>

                <h3>{t.sub || "(no subject)"}</h3>

                <p className="muted small">
                  {t.name} · {t.now} · replies {t.replies} · images {t.images} ·
                  page {t.page}
                </p>

                {t.tim && full && (
                  <button onClick={() => openImage(full)}>
                    {t.tim}
                    {t.ext}
                  </button>
                )}

                <div
                  className="html"
                  dangerouslySetInnerHTML={{ __html: t.com || "" }}
                />
              </article>
            );
          })}
        </section>

        <section className="stack viewer">
          <div className="panel">
            <h2>{selected ? `Thread #${selected.no}` : "Open a thread"}</h2>
            <p className="muted">
              Click the numbered ID to open a thread. Click the filename button
              like 123.jpg / 123.png to open the image.
            </p>
          </div>

          {shownPosts.map((p) => {
            const full = mediaUrl(activeBoard, p);

            return (
              <article className="post" key={p.no}>
                <div className="spread">
                  <div>
                    <span className="badge">#{p.no}</span>{" "}
                    <span className="muted small">
                      {p.name} · {p.now}
                    </span>
                  </div>

                  <button
                    className="danger"
                    onClick={() =>
                      removeForever(
                        postKey(activeBoard, p.no),
                        `${activeBoard} post ${p.no}`
                      )
                    }
                  >
                    delete forever
                  </button>
                </div>

                {p.tim && full && (
                  <button onClick={() => openImage(full)}>
                    {p.tim}
                    {p.ext}
                  </button>
                )}

                <div
                  className="html"
                  dangerouslySetInnerHTML={{ __html: p.com || "" }}
                />
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}