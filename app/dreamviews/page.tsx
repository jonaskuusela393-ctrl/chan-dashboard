"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteForever, loadDeleted } from "@/lib/deletedClient";

type Forum = {
  title: string;
  path: string;
  threads?: string;
  posts?: string;
};

type Thread = {
  title: string;
  path: string;
  snippet?: string;
  html?: string;
};

type Post = {
  id: string;
  author?: string;
  date?: string;
  html: string;
};

const DELETE_SCOPE = "dreamviews";
const DEFAULT_FORUM_PATH = "/forum.php";

function forumKey(path: string) {
  return `forum:${path}`;
}

function threadKey(path: string) {
  return `thread:${path}`;
}

function postKey(path: string, id: string) {
  return `post:${path}:${id}`;
}

function cleanPath(input: string) {
  const raw = (input || DEFAULT_FORUM_PATH).trim();

  if (!raw) {
    return DEFAULT_FORUM_PATH;
  }

  try {
    const url = new URL(raw, "https://www.dreamviews.com");

    if (
      url.hostname !== "www.dreamviews.com" &&
      url.hostname !== "dreamviews.com"
    ) {
      return DEFAULT_FORUM_PATH;
    }

    return `${url.pathname}${url.search}` || DEFAULT_FORUM_PATH;
  } catch {
    return DEFAULT_FORUM_PATH;
  }
}

function looksLikeForum(path: string) {
  const lower = path.toLowerCase();

  return (
    lower === "/forum.php" ||
    lower.includes("forumdisplay") ||
    lower.includes("/forums/") ||
    /^\/f\d+/i.test(lower)
  );
}

function looksLikeThread(path: string) {
  const lower = path.toLowerCase();

  if (looksLikeForum(lower)) {
    return false;
  }

  return (
    lower.includes("showthread") ||
    lower.includes("/threads/") ||
    /^\/t\d+/i.test(lower) ||
    /\/\d+[-_a-z0-9]*\.html$/i.test(lower)
  );
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

export default function DreamviewsPage() {
  const [forums, setForums] = useState<Forum[]>([]);

  const [forumPath, setForumPath] = useState(DEFAULT_FORUM_PATH);
  const [forumTitle, setForumTitle] = useState("DreamViews forums");
  const [threads, setThreads] = useState<Thread[]>([]);

  const [threadPath, setThreadPath] = useState("");
  const [threadTitle, setThreadTitle] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);

  const [manualPath, setManualPath] = useState(DEFAULT_FORUM_PATH);
  const [search, setSearch] = useState("");

  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const [loadingForums, setLoadingForums] = useState(false);
  const [loadingForum, setLoadingForum] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingDeletes, setLoadingDeletes] = useState(false);

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

  async function loadForums() {
    setLoadingForums(true);
    setError("");

    try {
      await refreshDeleted();

      const res = await fetch("/api/dreamviews/forums", {
        cache: "no-store",
      });

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "DreamViews forums failed");
      }

      setForums(Array.isArray(data.forums) ? data.forums : []);
    } catch (error) {
      setError(errorMessage(error, "DreamViews forums failed"));
      setForums([]);
    } finally {
      setLoadingForums(false);
    }
  }

  async function loadForum(pathInput: string) {
    const actual = cleanPath(pathInput || DEFAULT_FORUM_PATH);

    setForumPath(actual);
    setManualPath(actual);
    setForumTitle(actual);
    setThreadPath("");
    setThreadTitle("");
    setThreads([]);
    setPosts([]);
    setError("");
    setLoadingForum(true);

    try {
      await refreshDeleted();

      const res = await fetch(
        `/api/dreamviews/forum?path=${encodeURIComponent(actual)}`,
        { cache: "no-store" }
      );

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "DreamViews forum failed");
      }

      setForumTitle(data.title || actual);
      setThreads(Array.isArray(data.threads) ? data.threads : []);

      if (Array.isArray(data.forums) && data.forums.length > 0) {
        setForums(data.forums);
      }
    } catch (error) {
      setError(errorMessage(error, "DreamViews forum failed"));
      setThreads([]);
    } finally {
      setLoadingForum(false);
    }
  }

  async function loadThread(pathInput: string) {
    const actual = cleanPath(pathInput);

    if (!looksLikeThread(actual)) {
      setError("That does not look like a DreamViews thread path.");
      return;
    }

    setThreadPath(actual);
    setManualPath(actual);
    setThreadTitle(actual);
    setPosts([]);
    setError("");
    setLoadingThread(true);

    try {
      await refreshDeleted();

      const res = await fetch(
        `/api/dreamviews/thread?path=${encodeURIComponent(actual)}`,
        { cache: "no-store" }
      );

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "DreamViews thread failed");
      }

      setThreadTitle(data.title || actual);
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (error) {
      setError(errorMessage(error, "DreamViews thread failed"));
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

      if (key === threadKey(threadPath)) {
        setThreadPath("");
        setThreadTitle("");
        setPosts([]);
      }
    } catch (error) {
      setError(errorMessage(error, "Database delete failed"));
      await refreshDeleted();
    }
  }

  function openManualAsForum() {
    const path = cleanPath(manualPath);
    loadForum(path);
  }

  function openManualAsThread() {
    const path = cleanPath(manualPath);

    if (!looksLikeThread(path)) {
      setError("Paste an actual DreamViews thread URL/path before opening as thread.");
      return;
    }

    loadThread(path);
  }

  useEffect(() => {
    loadForums();
    loadForum(DEFAULT_FORUM_PATH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleForums = useMemo(() => {
    return forums.filter((forum) => !deleted.has(forumKey(forum.path)));
  }, [forums, deleted]);

  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase();

    return threads
      .filter((thread) => !deleted.has(threadKey(thread.path)))
      .filter((thread) => {
        if (!q) return true;

        return `${thread.title || ""} ${thread.snippet || ""} ${
          thread.html || ""
        }`
          .toLowerCase()
          .includes(q);
      });
  }, [threads, search, deleted]);

  const visiblePosts = useMemo(() => {
    return posts.filter((post) => !deleted.has(postKey(threadPath, post.id)));
  }, [posts, threadPath, deleted]);

  const loading =
    loadingForums || loadingForum || loadingThread || loadingDeletes;

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">DREAMVIEWS</p>
            <h1>DreamViews viewport</h1>
            <p className="muted">
              Read-only text browser. No login, no posting, no images. Deletes
              are permanent Neon tombstones.
            </p>
          </div>

          <div className="row">
            <button onClick={loadForums} disabled={loadingForums}>
              reload forums
            </button>

            <button onClick={refreshDeleted} disabled={loadingDeletes}>
              reload deletes
            </button>
          </div>
        </div>

        <div className="row">
          <input
            value={manualPath}
            onChange={(event) => setManualPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") openManualAsForum();
            }}
            placeholder="/forum.php or DreamViews URL"
            aria-label="DreamViews path or URL"
            style={{ minWidth: 280 }}
          />

          <button onClick={openManualAsForum} disabled={loadingForum}>
            open as forum
          </button>

          <button onClick={openManualAsThread} disabled={loadingThread}>
            open as thread
          </button>

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
              <h2>Forums</h2>
              <p className="muted small">
                showing {visibleForums.length} / {forums.length}
              </p>
            </div>

            <span className="badge">index</span>
          </div>

          {visibleForums.length === 0 && !loadingForums && (
            <div className="panel">
              <p className="muted">
                No forums loaded. Try reload forums or open /forum.php.
              </p>
            </div>
          )}

          {visibleForums.map((forum) => (
            <article className="thread stack" key={forum.path}>
              <div className="spread">
                <button onClick={() => loadForum(forum.path)} disabled={loadingForum}>
                  {forum.title || forum.path}
                </button>

                <button
                  className="danger"
                  onClick={() =>
                    removeForever(forumKey(forum.path), forum.title || forum.path)
                  }
                >
                  delete forever
                </button>
              </div>

              <p className="muted small">
                {forum.path}
                {forum.threads ? ` · threads ${forum.threads}` : ""}
                {forum.posts ? ` · posts ${forum.posts}` : ""}
              </p>
            </article>
          ))}
        </section>

        <section className="stack viewer">
          <div className="panel stack">
            <div>
              <h2>{forumTitle || "Forum"}</h2>
              <p className="muted small">Current forum: {forumPath}</p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="filter loaded threads"
              aria-label="filter loaded threads"
            />
          </div>

          {visibleThreads.length === 0 && !loadingForum && (
            <div className="panel">
              <p className="muted">
                No threads loaded. Open a forum from the left or paste a forum URL.
              </p>
            </div>
          )}

          {visibleThreads.map((thread) => (
            <article className="thread stack" key={thread.path}>
              <div className="spread">
                <button
                  onClick={() => loadThread(thread.path)}
                  disabled={loadingThread}
                >
                  {thread.title || thread.path}
                </button>

                <button
                  className="danger"
                  onClick={() =>
                    removeForever(threadKey(thread.path), thread.title || thread.path)
                  }
                >
                  delete forever
                </button>
              </div>

              <p className="muted small">{thread.path}</p>

              {thread.snippet && <p>{thread.snippet}</p>}
            </article>
          ))}

          {threadTitle && (
            <div className="panel stack">
              <div className="spread">
                <div>
                  <h2>{threadTitle}</h2>
                  <p className="muted small">Current thread: {threadPath}</p>
                </div>

                <button
                  onClick={() => loadThread(threadPath)}
                  disabled={loadingThread || !threadPath}
                >
                  reload thread
                </button>
              </div>
            </div>
          )}

          {loadingThread && (
            <div className="panel">
              <p className="muted">Loading thread...</p>
            </div>
          )}

          {threadTitle && visiblePosts.length === 0 && !loadingThread && (
            <div className="panel">
              <p className="muted">
                No posts shown. They may be deleted or the thread parser found no
                readable posts.
              </p>
            </div>
          )}

          {visiblePosts.map((post) => (
            <article className="post stack" key={post.id}>
              <div className="spread">
                <div>
                  <span className="badge">{post.id}</span>{" "}
                  <span className="muted small">
                    {post.author || "unknown"}
                    {post.date ? ` · ${post.date}` : ""}
                  </span>
                </div>

                <button
                  className="danger"
                  onClick={() =>
                    removeForever(
                      postKey(threadPath, post.id),
                      `${threadTitle || threadPath} ${post.id}`
                    )
                  }
                >
                  delete forever
                </button>
              </div>

              <div
                className="html"
                dangerouslySetInnerHTML={{ __html: post.html || "" }}
              />
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}