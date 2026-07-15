"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { BOARD_GROUPS, isPermanentlyExcludedBoard } from "@/lib/chan";

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

type MediaState = {
  url: string;
  label: string;
  kind: "image" | "video";
} | null;

const SCOPE = "chan";

function firstAvailableBoard(blocks: Block[]) {
  const blocked = new Set(blocks.map((block) => block.board));

  for (const group of BOARD_GROUPS) {
    for (const [board] of group.boards) {
      if (!blocked.has(board) && !isPermanentlyExcludedBoard(board)) {
        return board;
      }
    }
  }

  return "";
}

function cleanBoard(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

function threadKey(board: string, no: number) {
  return `thread:${board}:${no}`;
}

function postKey(board: string, no: number) {
  return `post:${board}:${no}`;
}

function mediaKey(board: string, no: number) {
  return `${board}:${no}`;
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

function IconAction({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`icon-action ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

function IconLink({
  label,
  children,
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string; children: ReactNode }) {
  return (
    <a
      className={`buttonlike icon-action ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </a>
  );
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
  const [openMedia, setOpenMedia] = useState<Record<string, MediaState>>({});

  const viewRef = useRef<HTMLElement | null>(null);

  const blockedBoards = useMemo(() => new Set(blocks.map((block) => block.board)), [blocks]);
  const activeBlocked = blockedBoards.has(activeBoard);

  async function loadDeleted() {
    const response = await fetch(`/api/deleted?scope=${SCOPE}`, {
      cache: "no-store",
    });

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.error || "deleted load failed");
    }

    const nextDeleted = new Set<string>(
      Array.isArray(data.keys)
        ? data.keys.filter((key: unknown) => typeof key === "string")
        : []
    );

    setDeleted(nextDeleted);
    return nextDeleted;
  }

  async function loadBlocks() {
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
      const [nextDeleted, nextBlocks] = await Promise.all([loadDeleted(), loadBlocks()]);
      setStatus(`synced · deleted ${nextDeleted.size} · disabled boards ${nextBlocks.length}`);
    } catch (error) {
      setStatus(errorMessage(error, "sync failed"));
    }
  }

  async function boot() {
    setLoading(true);

    try {
      const [, freshBlocks] = await Promise.all([loadDeleted(), loadBlocks()]);
      const initialBoard = firstAvailableBoard(freshBlocks);

      if (!initialBoard) {
        setBoardInput("");
        setActiveBoard("");
        setThreads([]);
        setStatus("Every available board is disabled.");
        return;
      }

      await loadCatalog(initialBoard, false, freshBlocks);
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

    if (isPermanentlyExcludedBoard(board)) {
      setBoardInput("");
      setStatus("That board is permanently unavailable.");
      return;
    }

    if (manageLoading) {
      setLoading(true);
    }

    setOpenMedia({});
    setSelected(null);
    setPosts([]);
    setStatus(`loading /${board}/...`);

    try {
      const [, freshBlocks] = knownBlocks
        ? [deleted, knownBlocks]
        : await Promise.all([loadDeleted(), loadBlocks()]);

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
    setOpenMedia({});
    setLoading(true);
    setStatus(`opening #${thread.no}...`);

    try {
      await loadDeleted();

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

      window.setTimeout(() => {
        viewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (error) {
      setStatus(errorMessage(error, "thread failed"));
    } finally {
      setLoading(false);
    }
  }

  async function remove(key: string, label: string) {
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
          label,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "delete failed");
      }

      if (selected && key === threadKey(activeBoard, selected.no)) {
        setSelected(null);
        setPosts([]);
        setOpenMedia({});
      }

      setStatus(`deleted: ${label}`);
    } catch (error) {
      setStatus(errorMessage(error, "delete failed"));
      await loadDeleted();
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

      const durationText =
        mode === "permanent" ? "permanently" : `for ${mode} day${mode === "1" ? "" : "s"}`;

      if (activeBoard === board || boardInput === board) {
        setThreads([]);
        setSelected(null);
        setPosts([]);
        setOpenMedia({});

        const fallback = firstAvailableBoard(nextBlocks);

        if (fallback) {
          await loadCatalog(fallback, false, nextBlocks);
          setStatus(`/${board}/ disabled ${durationText} · switched to /${fallback}/`);
        } else {
          setBoardInput("");
          setActiveBoard("");
          setStatus(`/${board}/ disabled ${durationText} · no boards remain available`);
        }
      } else {
        setStatus(`/${board}/ disabled ${durationText}`);
      }
    } catch (error) {
      setStatus(errorMessage(error, "disable failed"));
    } finally {
      setLoading(false);
    }
  }

  function toggleMedia(item: Thread | Post) {
    const key = mediaKey(activeBoard, item.no);
    const existing = openMedia[key];

    if (existing) {
      setOpenMedia((old) => ({
        ...old,
        [key]: null,
      }));
      return;
    }

    const url = mediaUrl(activeBoard, item);
    const name = fileLabel(item);

    if (!url || !name) {
      setStatus("no media file on this post");
      return;
    }

    const kind = /\.(webm|mp4)$/i.test(name) ? "video" : "image";

    setOpenMedia((old) => ({
      ...old,
      [key]: {
        url,
        label: name,
        kind,
      },
    }));
  }

  function renderInlineMedia(item: Thread | Post) {
    const media = openMedia[mediaKey(activeBoard, item.no)];

    if (!media) return null;

    return (
      <div className="inline-media stack">
        <div className="spread">
          <span className="badge">{media.label}</span>
          <IconAction label="Close inline file" onClick={() => toggleMedia(item)}>×</IconAction>
        </div>

        {media.kind === "video" ? (
          <video className="media" src={media.url} controls />
        ) : (
          <img className="fullimg" src={media.url} alt={media.label} loading="lazy" />
        )}

        <IconLink label="Open original file in a new tab" href={media.url} target="_blank" rel="noreferrer">↗</IconLink>
      </div>
    );
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
            <h1 className="terminal-title">4chan viewport</h1>
            <p className="muted">
              Read-only. Per-user deletes and per-user board disables. Files open inline
              next to the button you clicked.
            </p>
          </div>

          <div className="row">
            <IconAction label="Reload board" onClick={() => loadCatalog(activeBoard)} disabled={loading || activeBlocked}>↻</IconAction>
            <IconAction label="Synchronize deleted posts and disabled boards" onClick={syncAll} disabled={loading}>⟳</IconAction>
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

          <IconAction label="Load board" onClick={() => loadCatalog(boardInput)} disabled={loading}>→</IconAction>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="filter loaded threads"
          />
        </div>

        <details className="panel stack">
          <summary>4chan board list</summary>
          <p className="muted small">
            Tap a board to select and load it. Disabled boards stay hidden for your account.
          </p>
          {BOARD_GROUPS.map((group) => {
            const visibleBoards = group.boards.filter(
              ([board]) =>
                !blockedBoards.has(board) && !isPermanentlyExcludedBoard(board)
            );

            if (visibleBoards.length === 0) return null;

            return (
              <div className="stack" key={group.title}>
                <h3>{group.title}</h3>
                <div className="board-grid">
                  {visibleBoards.map(([board, label]) => (
                    <button
                      className="board-chip"
                      key={`${group.title}-${board}`}
                      onClick={() => loadCatalog(board)}
                      disabled={loading}
                      title={label}
                    >
                      /{board}/ {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </details>

        <div className="row">
          <IconAction className="warn duration-icon" label="Disable this board for 1 day" onClick={() => disableBoard("1")} disabled={loading}>◷1</IconAction>
          <IconAction className="warn duration-icon" label="Disable this board for 7 days" onClick={() => disableBoard("7")} disabled={loading}>◷7</IconAction>
          <IconAction className="warn duration-icon" label="Disable this board for 30 days" onClick={() => disableBoard("30")} disabled={loading}>◷30</IconAction>
          <IconAction className="danger" label="Disable this board forever" onClick={() => disableBoard("permanent")} disabled={loading}>∞</IconAction>
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

      <div className="chan-layout">
        <section className="stack chan-view" ref={viewRef}>
          <div className="panel stack">
            <div>
              <h2>{selected ? `Thread #${selected.no}` : "Open a thread"}</h2>
              <p className="muted small">
                {selected
                  ? `showing ${shownPosts.length}/${posts.length} loaded replies after your deletes`
                  : "On mobile, opened threads appear here above the catalog so you do not have to scroll through every thread."}
              </p>
            </div>

            {selected && (
              <div className="row">
                <IconAction label="Reload this thread" onClick={() => openThread(selected)} disabled={loading}>↻</IconAction>
                <IconAction
                  className="danger"
                  label="Delete and permanently hide this whole thread"
                  onClick={() =>
                    remove(threadKey(activeBoard, selected.no), `${activeBoard} thread ${selected.no}`)
                  }
                >×</IconAction>
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

                <IconAction
                  className="danger"
                  label="Delete and permanently hide this post"
                  onClick={() => remove(postKey(activeBoard, post.no), `${activeBoard} post ${post.no}`)}
                >×</IconAction>
              </div>

              {post.tim && (
                <div className="stack">
                  <IconAction
                    label={`${openMedia[mediaKey(activeBoard, post.no)] ? "Close" : "View"} ${fileLabel(post)}`}
                    onClick={() => toggleMedia(post)}
                  >{openMedia[mediaKey(activeBoard, post.no)] ? "▢" : "▣"}</IconAction>
                  {renderInlineMedia(post)}
                </div>
              )}

              <div className="html" dangerouslySetInnerHTML={{ __html: post.com || "" }} />
            </article>
          ))}
        </section>

        <section className="stack chan-list">
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
                  <IconAction
                    label={`${selected?.no === thread.no ? "Currently open" : "Open"} thread #${thread.no}`}
                    onClick={() => openThread(thread)}
                  >{selected?.no === thread.no ? "●" : "▶"}</IconAction>
                  <span className="badge">#{thread.no}</span>
                  {thread.sticky && <span className="badge warn">sticky</span>}
                  {thread.closed && <span className="badge danger">closed</span>}
                </div>

                <IconAction
                  className="danger"
                  label="Delete and permanently hide this thread"
                  onClick={() =>
                    remove(threadKey(activeBoard, thread.no), `${activeBoard} thread ${thread.no}`)
                  }
                >×</IconAction>
              </div>

              <div>
                <h3>{thread.sub || "(no subject)"}</h3>
                <p className="muted small">
                  {thread.name || "Anonymous"} · replies {thread.replies ?? 0} · images{" "}
                  {thread.images ?? 0} · page {thread.page ?? "?"}
                </p>
              </div>

              {thread.tim && (
                <div className="stack">
                  <IconAction
                    label={`${openMedia[mediaKey(activeBoard, thread.no)] ? "Close" : "View"} ${fileLabel(thread)}`}
                    onClick={() => toggleMedia(thread)}
                  >{openMedia[mediaKey(activeBoard, thread.no)] ? "▢" : "▣"}</IconAction>
                  {renderInlineMedia(thread)}
                </div>
              )}

              <div className="html" dangerouslySetInnerHTML={{ __html: thread.com || "" }} />
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
