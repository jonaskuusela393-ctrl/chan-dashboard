"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteForever, loadDeleted } from "@/lib/deletedClient";

type ChanThread = {
  no: number;
  sub?: string;
  name?: string;
  now?: string;
  replies?: number;
  images?: number;
  com?: string;
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

type ImageTarget = {
  url: string;
  label: string;
} | null;

const DELETE_SCOPE = "chan";
const DEFAULT_BOARD = "g";

function cleanBoard(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

function threadKey(board: string, no: number) {
  return `thread:${board}:${no}`;
}

function postKey(board: string, no: number) {
  return `post:${board}:${no}`;
}

function fileLabel(p: { tim?: number; ext?: string; filename?: string }) {
  if (!p.tim || !p.ext) return "";
  return `${p.filename || p.tim}${p.ext}`;
}

function directImageUrl(board: string, p: { tim?: number; ext?: string }) {
  if (!board || !p.tim || !p.ext) return "";
  return `https://i.4cdn.org/${board}/${p.tim}${p.ext}`;
}

function proxyImageUrl(board: string, p: { tim?: number; ext?: string }) {
  if (!board || !p.tim || !p.ext) return "";

  return `/api/chan/image?board=${encodeURIComponent(board)}&tim=${encodeURIComponent(
    String(p.tim)
  )}&ext=${encodeURIComponent(p.ext)}`;
}

async function readJson(res: Response) {
  const text = await res.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export default function ChanPage() {
  const [boardInput, setBoardInput] = useState(DEFAULT_BOARD);
  const [activeBoard, setActiveBoard] = useState(DEFAULT_BOARD);

  const [threads, setThreads] = useState<ChanThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChanThread | null>(null);
  const [posts, setPosts] = useState<ChanPost[]>([]);

  const [image, setImage] = useState<ImageTarget>(null);

  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingDeletes, setLoadingDeletes] = useState(false);

  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  async function refreshDeleted() {
    setLoadingDeletes(true);

    try {
      const nextDeleted = await loadDeleted(DELETE_SCOPE);
      setDeleted(nextDeleted);
      return nextDeleted;
    } catch (error) {
      setError(errorMessage(error, "Could not load database deletes"));
      return deleted;
    } finally {
      setLoadingDeletes(false);
    }
  }

  async function loadCatalog(rawBoard = boardInput) {
    const nextBoard = cleanBoard(rawBoard || DEFAULT_BOARD);

    if (!nextBoard) {
      setError("Board is empty");
      return;
    }

    setLoadingCatalog(true);
    setError("");
    setImage(null);
    setSelectedThread(null);
    setPosts([]);

    try {
      await refreshDeleted();

      const res = await fetch(
        `/api/chan/catalog?board=${encodeURIComponent(nextBoard)}`,
        { cache: "no-store" }
      );

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Catalog failed");
      }

      setActiveBoard(nextBoard);
      setBoardInput(nextBoard);
      setThreads(Array.isArray(data.threads) ? data.threads : []);
    } catch (error) {
      setError(errorMessage(error, "Catalog failed"));
      setThreads([]);
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function openThread(thread: ChanThread) {
    const board = activeBoard;

    if (!board || !thread.no) {
      setError("Missing board or thread number");
      return;
    }

    setSelectedThread(thread);
    setLoadingThread(true);
    setError("");
    setImage(null);
    setPosts([]);

    try {
      await refreshDeleted();

      const res = await fetch(
        `/api/chan/thread?board=${encodeURIComponent(board)}&no=${thread.no}`,
        { cache: "no-store" }
      );

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Thread failed");
      }

      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (error) {
      setError(errorMessage(error, "Thread failed"));
      setPosts([]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function removeForever(key: string, label: string) {
    setError("");

    setDeleted((old) => {
      const next = new Set(old);
      next.add(key);
      return next;
    });

    try {
      await deleteForever(DELETE_SCOPE, key, label);

      if (selectedThread && key === threadKey(activeBoard, selectedThread.no)) {
        setSelectedThread(null);
        setPosts([]);
        setImage(null);
      }
    } catch (error) {
      setError(errorMessage(error, "Database delete failed"));
      await refreshDeleted();
    }
  }

  function showImage(board: string, item: { tim?: number; ext?: string; filename?: string }) {
    const url = proxyImageUrl(board, item);
    const label = fileLabel(item);

    if (!url || !label) {
      setError("This post has no image file");
      return;
    }

    setError("");
    setImage({ url, label });
  }

  function openImageInNewTab(board: string, item: { tim?: number; ext?: string }) {
    const url = directImageUrl(board, item);

    if (!url) {
      setError("This post has no image file");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    loadCatalog(DEFAULT_BOARD);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownThreads = useMemo(() => {
    const q = search.trim().toLowerCase();

    return threads
      .filter((thread) => !deleted.has(threadKey(activeBoard, thread.no)))
      .filter((thread) => {
        if (!q) return true;

        return `${thread.no} ${thread.sub || ""} ${thread.name || ""} ${
          thread.com || ""
        }`
          .toLowerCase()
          .includes(q);
      });
  }, [threads, activeBoard, search, deleted]);

  const shownPosts = useMemo(() => {
    return posts.filter((post) => !deleted.has(postKey(activeBoard, post.no)));
  }, [posts, activeBoard, deleted]);

  const loading = loadingCatalog || loadingThread || loadingDeletes;

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">/{activeBoard}/</p>
            <h1>4chan viewport</h1>
            <p className="muted">
              Read-only catalog and thread viewer. Deletes are permanent Neon
              tombstones. Images do not auto-load; click a filename when you want
              to view one.
            </p>
          </div>

          <div className="row">
            <button onClick={() => loadCatalog(activeBoard)} disabled={loadingCatalog}>
              reload board
            </button>

            <button onClick={refreshDeleted} disabled={loadingDeletes}>
              reload deletes
            </button>
          </div>
        </div>

        <div className="row">
          <input
            value={boardInput}
            onChange={(event) => setBoardInput(cleanBoard(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                loadCatalog(boardInput);
              }
            }}
            placeholder="board, example g"
            aria-label="4chan board"
          />

          <button onClick={() => loadCatalog(boardInput)} disabled={loadingCatalog}>
            load board
          </button>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="filter threads"
            aria-label="filter threads"
          />

          {loading && <span className="muted small">loading...</span>}
        </div>

        {error && (
          <div className="panel" style={{ borderColor: "var(--danger2)" }}>
            <span className="small" style={{ color: "var(--danger)" }}>
              {error}
            </span>
          </div>
        )}
      </section>

      <div className="two">
        <section className="stack">
          <div className="panel spread">
            <div>
              <h2>Threads</h2>
              <p className="muted small">
                showing {shownThreads.length} / {threads.length}
              </p>
            </div>

            <span className="badge">/{activeBoard}/ catalog</span>
          </div>

          {shownThreads.length === 0 && !loadingCatalog && (
            <div className="panel">
              <p className="muted">No threads shown. Try reload board or clear filter.</p>
            </div>
          )}

          {shownThreads.map((thread) => {
            const label = fileLabel(thread);
            const isSelected = selectedThread?.no === thread.no;

            return (
              <article className="thread stack" key={thread.no}>
                <div className="spread">
                  <div className="row">
                    <button onClick={() => openThread(thread)}>
                      {isSelected ? "opened" : "open"} #{thread.no}
                    </button>

                    {thread.sticky && <span className="badge">sticky</span>}
                    {thread.closed && <span className="badge">closed</span>}
                  </div>

                  <button
                    className="danger"
                    onClick={() =>
                      removeForever(
                        threadKey(activeBoard, thread.no),
                        `${activeBoard} thread ${thread.no}`
                      )
                    }
                  >
                    delete forever
                  </button>
                </div>

                <div>
                  <h3>{thread.sub || "(no subject)"}</h3>

                  <p className="muted small">
                    {thread.name || "Anonymous"} · {thread.now || ""} · replies{" "}
                    {thread.replies ?? 0} · images {thread.images ?? 0} · page{" "}
                    {thread.page ?? "?"}
                  </p>
                </div>

                {thread.tim && label && (
                  <div className="row">
                    <button onClick={() => showImage(activeBoard, thread)}>
                      view {label}
                    </button>

                    <button onClick={() => openImageInNewTab(activeBoard, thread)}>
                      open file tab
                    </button>
                  </div>
                )}

                <div
                  className="html"
                  dangerouslySetInnerHTML={{ __html: thread.com || "" }}
                />
              </article>
            );
          })}
        </section>

        <section className="stack viewer">
          {image && (
            <div className="panel stack">
              <div className="spread">
                <div>
                  <h2>{image.label}</h2>
                  <p className="muted small">Loaded only because you clicked it.</p>
                </div>

                <button onClick={() => setImage(null)}>close image</button>
              </div>

              <img className="fullimg" src={image.url} alt={image.label} />

              <div className="row">
                <a className="buttonlike" href={image.url} target="_blank" rel="noreferrer">
                  open image tab
                </a>
              </div>
            </div>
          )}

          <div className="panel stack">
            <div>
              <h2>
                {selectedThread
                  ? `Thread #${selectedThread.no}`
                  : "Open a thread"}
              </h2>

              <p className="muted">
                Click a thread number to load replies. Click file buttons like
                123.jpg / 123.png to view images.
              </p>
            </div>

            {selectedThread && (
              <div className="row">
                <button onClick={() => openThread(selectedThread)} disabled={loadingThread}>
                  reload thread
                </button>

                <button
                  className="danger"
                  onClick={() =>
                    removeForever(
                      threadKey(activeBoard, selectedThread.no),
                      `${activeBoard} thread ${selectedThread.no}`
                    )
                  }
                >
                  delete thread forever
                </button>
              </div>
            )}
          </div>

          {loadingThread && (
            <div className="panel">
              <p className="muted">Loading thread...</p>
            </div>
          )}

          {selectedThread && shownPosts.length === 0 && !loadingThread && (
            <div className="panel">
              <p className="muted">
                No posts shown. They may be deleted, hidden, or the thread failed
                to load.
              </p>
            </div>
          )}

          {shownPosts.map((post) => {
            const label = fileLabel(post);

            return (
              <article className="post stack" key={post.no}>
                <div className="spread">
                  <div>
                    <span className="badge">#{post.no}</span>{" "}
                    <span className="muted small">
                      {post.name || "Anonymous"} · {post.now || ""}
                    </span>
                  </div>

                  <button
                    className="danger"
                    onClick={() =>
                      removeForever(
                        postKey(activeBoard, post.no),
                        `${activeBoard} post ${post.no}`
                      )
                    }
                  >
                    delete forever
                  </button>
                </div>

                {post.tim && label && (
                  <div className="row">
                    <button onClick={() => showImage(activeBoard, post)}>
                      view {label}
                    </button>

                    <button onClick={() => openImageInNewTab(activeBoard, post)}>
                      open file tab
                    </button>
                  </div>
                )}

                <div
                  className="html"
                  dangerouslySetInnerHTML={{ __html: post.com || "" }}
                />
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}