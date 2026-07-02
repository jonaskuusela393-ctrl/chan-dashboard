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

function media(board: string, p: { tim?: number; ext?: string }, thumb = false) {
  if (!p.tim || !p.ext) return "";

  const tim = thumb ? `${p.tim}s` : String(p.tim);
  const ext = thumb ? ".jpg" : p.ext;

  return `/api/chan/image?board=${encodeURIComponent(board)}&tim=${encodeURIComponent(
    tim
  )}&ext=${encodeURIComponent(ext)}`;
}

function threadKey(board: string, no: number) {
  return `thread:${board}:${no}`;
}

function postKey(board: string, no: number) {
  return `post:${board}:${no}`;
}

export default function ChanPage() {
  const [board, setBoard] = useState("g");
  const [threads, setThreads] = useState<ChanThread[]>([]);
  const [selected, setSelected] = useState<ChanThread | null>(null);
  const [posts, setPosts] = useState<ChanPost[]>([]);
  const [image, setImage] = useState("");
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

  async function loadCatalog(nextBoard = board) {
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

      setThreads(data.threads || []);
    } catch (e: any) {
      setError(e.message || "Catalog failed");
    } finally {
      setLoading(false);
    }
  }

  async function openThread(t: ChanThread) {
    setSelected(t);
    setLoading(true);
    setError("");

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
    loadCatalog(board);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownThreads = useMemo(() => {
    const q = search.trim().toLowerCase();

    return threads
      .filter((t) => !deleted.has(threadKey(board, t.no)))
      .filter((t) => {
        if (!q) return true;

        return `${t.no} ${t.sub} ${t.name} ${t.com}`.toLowerCase().includes(q);
      });
  }, [threads, board, search, deleted]);

  const shownPosts = useMemo(() => {
    return posts.filter((p) => !deleted.has(postKey(board, p.no)));
  }, [posts, board, deleted]);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>4chan viewport</h1>
          <p className="muted">
            Read-only. Delete writes a permanent tombstone to your Neon database.
            There is no unhide button in this app.
          </p>
        </div>
      </div>

      <div className="row panel">
        <input
          value={board}
          onChange={(e) =>
            setBoard(
              e.target.value
                .replace(/[^a-z0-9]/gi, "")
                .slice(0, 10)
                .toLowerCase()
            )
          }
          placeholder="board, example g"
        />

        <button onClick={() => loadCatalog(board)} disabled={loading}>
          load board
        </button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filter threads"
        />

        <button onClick={refreshDeleted}>reload deletes</button>

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
            const thumb = media(board, t, true);
            const full = media(board, t);

            return (
              <article className="thread" key={t.no}>
                <div className="spread">
                  <button onClick={() => openThread(t)}>#{t.no}</button>

                  <button
                    className="danger"
                    onClick={() =>
                      removeForever(threadKey(board, t.no), `${board} thread ${t.no}`)
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

                {thumb && (
                  <img
                    className="thumb"
                    src={thumb}
                    alt="thumb"
                    onClick={() => setImage(full)}
                  />
                )}

                {t.tim && (
                  <button onClick={() => setImage(full)}>
                    {t.tim}
                    {t.ext}
                  </button>
                )}

                <div className="html" dangerouslySetInnerHTML={{ __html: t.com }} />
              </article>
            );
          })}
        </section>

        <section className="stack viewer">
          {image && (
            <div className="panel">
              <button onClick={() => setImage("")}>close image</button>
              <br />
              <br />
              <img className="fullimg" src={image} alt="full" />
            </div>
          )}

          <div className="panel">
            <h2>{selected ? `Thread #${selected.no}` : "Open a thread"}</h2>
            <p className="muted">
              Click the numbered ID or the image filename button like id.jpg/id.png.
            </p>
          </div>

          {shownPosts.map((p) => {
            const full = media(board, p);
            const thumb = media(board, p, true);

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
                      removeForever(postKey(board, p.no), `${board} post ${p.no}`)
                    }
                  >
                    delete forever
                  </button>
                </div>

                {thumb && (
                  <img
                    className="thumb"
                    src={thumb}
                    alt="thumb"
                    onClick={() => setImage(full)}
                  />
                )}

                {p.tim && (
                  <button onClick={() => setImage(full)}>
                    {p.tim}
                    {p.ext}
                  </button>
                )}

                <div className="html" dangerouslySetInnerHTML={{ __html: p.com }} />
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}