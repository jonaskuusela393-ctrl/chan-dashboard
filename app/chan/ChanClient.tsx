"use client";

import { useEffect, useMemo, useState } from "react";

type Thread = {
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

type Post = Thread & {
  resto: number;
};

type Block = {
  board: string;
  expires_at: string | null;
  created_at: string;
};

type ImageState =
  | {
      url: string;
      label: string;
      kind: "image" | "video";
    }
  | null;

const SCOPE = "chan";

function cleanBoard(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

function threadKey(board: string, no: number) {
  return `thread:${board}:${no}`;
}

function postKey(board: string, no: number) {
  return `post:${board}:${no}`;
}

function fileLabel(item: { tim?: number; ext?: string; filename?: string }) {
  return item.tim && item.ext ? `${item.filename || item.tim}${item.ext}` : "";
}

function mediaUrl(board: string, item: { tim?: number; ext?: string }) {
  if (!item.tim || !item.ext) return "";

  return `/api/chan/image?board=${encodeURIComponent(board)}&tim=${item.tim}&ext=${encodeURIComponent(
    item.ext
  )}`;
}

function blockText(block: Block) {
  return block.expires_at
    ? `until ${new Date(block.expires_at).toLocaleString()}`
    : "permanent";
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) return {};

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

export default function ChanClient({ username }: { username: string }) {
  const [boardInput, setBoardInput] = useState("g");
  const [activeBoard, setActiveBoard] = useState("g");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [blocks, setBlocks] = useState<Block[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(`ready as ${username}`);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<ImageState>(null);

  const blockedBoards = useMemo(() => {
    return new Set(blocks.map((block) => block.board));
  }, [blocks]);

  const activeBlocked = blockedBoards.has(activeBoard);

  async function fetchDeleted() {
    const response = await fetch(`/api/deleted?scope=${SCOPE}`, {
      cache: "no-store",
    });

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.error || "deleted load failed");
    }

    const nextDeleted = new Set<string>(
      Array.isArray(data.keys) ? data.keys.filter((key: unknown) => typeof key === "string") : []
    );

    setDeleted(nextDeleted);
    return nextDeleted;
  }

  async function fetchBlocks() {
    const response = await fetch("/api/chan/blocks", {
      cache: "no-store",
    });

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.error || "blocks failed");
    }

    const nextBlocks = Array.isArray(data.blocks) ? data.blocks : [];

    setBlocks(nextBlocks);
    return nextBlocks as Block[];
  }

  async function syncAll() {
    try {
      await Promise.all([fetchDeleted(), fetchBlocks()]);
      setStatus("synced deletes and disabled boards");
    } catch (error) {
      setStatus(errorMessage(error, "sync failed"));
    }
  }

  async function boot() {
    setLoading(true);

    try {
      const [, freshBlocks] = await Promise.all([fetchDeleted(), fetchBlocks()]);
      await loadCatalog("g", false, freshBlocks);
    } catch (error) {
      setStatus(errorMessage(error, "boot failed"));
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog(rawBoard = boardInput, manageLoading = true, knownBlocks?: Block[]) {
    const board = cleanBoard(rawBoard || "g");

    if (!board) {
      setStatus("empty board");
      return;
    }

    if (manageLoading) {
      setLoading(true);
    }

    setImage(null);
    setSelected(null);
    setPosts([]);
    setStatus(`loading /${board}/...`);

    try {
      const [, freshBlocks] = knownBlocks
        ? [deleted, knownBlocks]
        : await Promise.all([fetchDeleted(), fetchBlocks()]);

      const disabled = freshBlocks.some((block) => block.board === board);

      if (disabled) {
        setActiveBoard(board);
        setBoardInput(board);
        setThreads([]);
        setStatus(`/${board}/ is disabled for your account.`);
        return;
      }

      const response = await fetch(`/api/chan/catalog?board=${encodeURIComponent(board)}`, {
        cache: "no-store",
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "catalog failed");
      }

      const nextThreads = Array.isArray(data.threads) ? data.threads : [];

      setActiveBoard(board);
      setBoardInput(board);
      setThreads(nextThreads);
      setStatus(`loaded /${board}/ · ${data.count || nextThreads.length} threads`);
    } catch (error) {
      setStatus(errorMessage(error, "catalog failed"));
      setThreads([]);
    } finally {
      if (manageLoading) {
        setLoading(false);
      }
    }
  }

  async function openThread(thread: Thread) {
    if (activeBlocked) {
      setStatus(`/${activeBoard}/ is disabled.`);
      return;
    }

    setSelected(thread);
    setPosts([]);
    setImage(null);
    setLoading(true);
    setStatus(`opening #${thread.no}...`);

    try {
      await fetchDeleted();

      const response = await fetch(
        `/api/chan/thread?board=${encodeURIComponent(activeBoard)}&no=${thread.no}`,
        { cache: "no-store" }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "thread failed");
      }

      const nextPosts = Array.isArray(data.posts) ? data.posts : [];

      setPosts(nextPosts);
      setStatus(`thread #${thread.no} · loaded ${nextPosts.length} total posts`);
    } catch (error) {
      setStatus(errorMessage(error, "thread failed"));
    } finally {
      setLoading(false);
    }
  }

  async function remove(key: string, why: string) {
    setDeleted((old) => {
      const next = new Set(old);
      next.add(key);
      return next;
    });

    try {
      const response = await fetch("/api/deleted", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: SCOPE,
          key,
          label: why,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "delete failed");
      }

      if (selected && key === threadKey(activeBoard, selected.no)) {
        setSelected(null);
        setPosts([]);
        setImage(null);
      }

      setStatus(`deleted: ${why}`);
    } catch (error) {
      setStatus(errorMessage(error, "delete failed"));
      await fetchDeleted();
    }
  }

  async function disableBoard(mode: "1" | "7" | "30" | "permanent") {
    const board = cleanBoard(boardInput || activeBoard);

    if (!board) {
      setStatus("empty board");
      return;
    }

    setLoading(true);
    setStatus(`disabling /${board}/...`);

    try {
      const response = await fetch("/api/chan/blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          board,
          mode,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "disable failed");
      }

      const nextBlocks = Array.isArray(data.blocks) ? data.blocks : [];

      setBlocks(nextBlocks);

      if (activeBoard === board) {
        setThreads([]);
        setSelected(null);
        setPosts([]);
        setImage(null);
      }

      setStatus(
        `/${board}/ disabled ${
          mode === "permanent" ? "permanently" : `for ${mode} day${mode === "1" ? "" : "s"}`
        }`
      );
    } catch (error) {
      setStatus(errorMessage(error, "disable failed"));
    } finally {
      setLoading(false);
    }
  }

  function viewMedia(item: Thread | Post) {
    const url = mediaUrl(activeBoard, item);
    const name = fileLabel(item);

    if (!url || !name) {
      setStatus("no media file on this post");
      return;
    }

    const kind = /\.(webm|mp4)$/i.test(name) ? "video" : "image";

    setImage({
      url,
      label: name,
      kind,
    });
  }

  useEffect(() => {
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownThreads = useMemo(() => {
    const q = search.toLowerCase().trim();

    return threads
      .filter((thread) => !deleted.has(threadKey(activeBoard, thread.no)))
      .filter((thread) => {
        if (!q) return true;

        return `${thread.no} ${thread.sub || ""} ${thread.name || ""} ${thread.com || ""}`
          .toLowerCase()
          .includes(q);
      });
  }, [threads, deleted, activeBoard, search]);

  const shownPosts = useMemo(() => {
    return posts.filter((post) => !deleted.has(postKey(activeBoard, post.no)));
  }, [posts, deleted, activeBoard]);

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">/{activeBoard}/</p>
            <h1>4chan viewport</h1>
            <p className="muted">
              Read-only. Per-user deletes and per-user board disables. No thumbnails
              load unless you click a file.
            </p>
          </div>

          <div className="row">
            <button onClick={() => loadCatalog(activeBoard)} disabled={loading || activeBlocked}>
              reload
            </button>

            <button onClick={syncAll} disabled={loading}>
              sync
            </button>
          </div>
        </div>

        <div className="row">
          <input
            value={boardInput}
            onChange={(event) => setBoardInput(cleanBoard(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void loadCatalog(boardInput);
              }
            }}
            placeholder="board e.g. g"
          />

          <button onClick={() => loadCatalog(boardInput)} disabled={loading}>
            load board
          </button>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="filter loaded threads"
          />
        </div>

        <div className="row">
          <button className="warn" onClick={() => disableBoard("1")} disabled={loading}>
            disable board 1 day
          </button>

          <button className="warn" onClick={() => disableBoard("7")} disabled={loading}>
            disable 7 days
          </button>

          <button className="warn" onClick={() => disableBoard("30")} disabled={loading}>
            disable 30 days
          </button>

          <button className="danger" onClick={() => disableBoard("permanent")} disabled={loading}>
            disable permanent
          </button>
        </div>

        <p className="muted small">
          Status: {loading ? "loading... " : ""}
          {status}
        </p>
      </section>

      {blocks.length > 0 && (
        <section className="panel stack">
          <h2>Disabled boards</h2>

          <div className="row">
            {blocks.map((block) => (
              <span className="badge warn" key={block.board}>
                /{block.board}/ {blockText(block)}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="two">
        <section className="stack">
          <div className="panel spread">
            <div>
              <h2>Threads</h2>
              <p className="muted small">
                showing {shownThreads.length}/{threads.length}
              </p>
            </div>

            <span className="badge">catalog</span>
          </div>

          {shownThreads.length === 0 && !loading && (
            <div className="panel">
              <p className="muted">
                No threads shown. Load a board, clear filter, or check disabled boards.
              </p>
            </div>
          )}

          {shownThreads.map((thread) => (
            <article className="thread stack" key={thread.no}>
              <div className="spread">
                <div className="row">
                  <button onClick={() => openThread(thread)}>open #{thread.no}</button>
                  {thread.sticky && <span className="badge warn">sticky</span>}
                  {thread.closed && <span className="badge danger">closed</span>}
                </div>

                <button
                  className="danger"
                  onClick={() =>
                    remove(threadKey(activeBoard, thread.no), `${activeBoard} thread ${thread.no}`)
                  }
                >
                  delete thread
                </button>
              </div>

              <div>
                <h3>{thread.sub || "(no subject)"}</h3>
                <p className="muted small">
                  {thread.name || "Anonymous"} · replies {thread.replies ?? 0} · images{" "}
                  {thread.images ?? 0} · page {thread.page ?? "?"}
                </p>
              </div>

              {thread.tim && (
                <div className="row">
                  <button onClick={() => viewMedia(thread)}>view {fileLabel(thread)}</button>
                </div>
              )}

              <div className="html" dangerouslySetInnerHTML={{ __html: thread.com || "" }} />
            </article>
          ))}
        </section>

        <section className="stack viewer">
          {image && (
            <div className="panel stack">
              <div className="spread">
                <h2>{image.label}</h2>
                <button onClick={() => setImage(null)}>close</button>
              </div>

              {image.kind === "video" ? (
                <video className="media" src={image.url} controls />
              ) : (
                <img className="fullimg" src={image.url} alt={image.label} />
              )}

              <a className="buttonlike" href={image.url} target="_blank" rel="noreferrer">
                open file tab
              </a>
            </div>
          )}

          <div className="panel stack">
            <div>
              <h2>{selected ? `Thread #${selected.no}` : "Open a thread"}</h2>
              <p className="muted small">
                {selected
                  ? `showing ${shownPosts.length}/${posts.length} loaded posts after your deletes`
                  : "Click a thread on the left. Long threads now expand down the page instead of being trapped inside a small scroll box."}
              </p>
            </div>

            {selected && (
              <div className="row">
                <button onClick={() => openThread(selected)} disabled={loading}>
                  reload thread
                </button>

                <button
                  className="danger"
                  onClick={() =>
                    remove(
                      threadKey(activeBoard, selected.no),
                      `${activeBoard} thread ${selected.no}`
                    )
                  }
                >
                  delete whole thread
                </button>

                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  top
                </button>

                <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
                  bottom
                </button>
              </div>
            )}
          </div>

          {selected && shownPosts.length === 0 && !loading && (
            <div className="panel">
              <p className="muted">
                No replies shown. They may be deleted, or the thread failed to load.
              </p>
            </div>
          )}

          {shownPosts.map((post) => (
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
                    remove(postKey(activeBoard, post.no), `${activeBoard} post ${post.no}`)
                  }
                >
                  delete post
                </button>
              </div>

              {post.tim && (
                <div className="row">
                  <button onClick={() => viewMedia(post)}>view {fileLabel(post)}</button>
                </div>
              )}

              <div className="html" dangerouslySetInnerHTML={{ __html: post.com || "" }} />
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}