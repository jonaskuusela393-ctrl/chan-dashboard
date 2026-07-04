"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  duration?: string;
  viewCount?: string;
  likeCount?: string;
};

const SCOPE = "youtube";

function videoKey(id: string) {
  return `video:${id}`;
}

function extract(input: string) {
  const raw = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/").filter(Boolean)[1] || "";
      }

      return url.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }

  return "";
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

function date(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString();
}

function num(value?: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? new Intl.NumberFormat(undefined, {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(parsed)
    : "?";
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export default function YouTubeClient() {
  const [query, setQuery] = useState("");
  const [direct, setDirect] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);

  const [token, setToken] = useState("");
  const [status, setStatus] = useState("text-only, no thumbnails");
  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState(false);

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const vid = useMemo(() => extract(direct), [direct]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => !hidden.has(videoKey(item.id)));
  }, [items, hidden]);

  async function loadHidden() {
    const response = await fetch(`/api/deleted?scope=${SCOPE}`, {
      cache: "no-store",
    });

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.error || "hidden videos load failed");
    }

    const nextHidden = new Set<string>(
      Array.isArray(data.keys) ? data.keys.filter((key: unknown) => typeof key === "string") : []
    );

    setHidden(nextHidden);
    return nextHidden;
  }

  async function syncHidden() {
    try {
      const nextHidden = await loadHidden();
      setStatus(`synced hidden videos · ${nextHidden.size} hidden`);
    } catch (error) {
      setStatus(errorMessage(error, "sync hidden failed"));
    }
  }

  async function hideForever(item: Item) {
    const key = videoKey(item.id);

    setHidden((old) => {
      const next = new Set(old);
      next.add(key);
      return next;
    });

    if (selected?.id === item.id) {
      setSelected(null);
      setPlayer(false);
    }

    try {
      const response = await fetch("/api/deleted", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: SCOPE,
          key,
          label: `${item.title || item.id} · ${item.channelTitle || "YouTube"}`,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "hide failed");
      }

      setStatus(`hidden forever: ${item.title || item.id}`);
    } catch (error) {
      setStatus(errorMessage(error, "hide failed"));
      await loadHidden();
    }
  }

  async function search(page = "") {
    if (!query.trim() || loading) {
      return;
    }

    setLoading(true);
    setStatus(page ? "loading more..." : "searching...");

    try {
      await loadHidden();

      const response = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(query.trim())}&pageToken=${encodeURIComponent(
          page
        )}`,
        { cache: "no-store" }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "search failed");
      }

      const newItems = Array.isArray(data.items) ? data.items : [];

      setItems((oldItems) => {
        const nextItems = page ? [...oldItems, ...newItems] : newItems;
        const visibleCount = nextItems.filter((item) => !hidden.has(videoKey(item.id))).length;

        setStatus(`${visibleCount}/${nextItems.length} results visible after hidden videos`);

        return nextItems;
      });

      setToken(data.nextPageToken || "");
    } catch (error) {
      setStatus(errorMessage(error, "search failed"));
    } finally {
      setLoading(false);
    }
  }

  async function open(id: string) {
    if (!id || loading) {
      return;
    }

    if (hidden.has(videoKey(id))) {
      setStatus("that video is hidden forever for your account");
      return;
    }

    setLoading(true);
    setPlayer(false);
    setStatus("loading video text...");

    try {
      await loadHidden();

      if (hidden.has(videoKey(id))) {
        setStatus("that video is hidden forever for your account");
        return;
      }

      const response = await fetch(`/api/youtube/video?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "video failed");
      }

      if (hidden.has(videoKey(data.id))) {
        setStatus("that video is hidden forever for your account");
        return;
      }

      setSelected(data);
      setStatus("video details loaded");
    } catch (error) {
      setStatus(errorMessage(error, "video failed"));
    } finally {
      setLoading(false);
    }
  }

  function clearResults() {
    setItems([]);
    setSelected(null);
    setToken("");
    setPlayer(false);
    setStatus("results cleared, hidden videos stayed hidden");
  }

  useEffect(() => {
    void loadHidden().catch((error) => {
      setStatus(errorMessage(error, "hidden videos load failed"));
    });
  }, []);

  return (
    <div className="stack">
      <section className="panel stack">
        <p className="badge">YOUTUBE TEXT</p>
        <h1>YouTube text browser</h1>
        <p className="muted">
          No thumbnails are loaded. The player only loads after pressing open player.
          Hidden videos are permanent per account.
        </p>

        <div className="row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void search();
              }
            }}
            placeholder="search YouTube"
          />

          <button onClick={() => search()} disabled={loading || !query.trim()}>
            search
          </button>

          {token && (
            <button onClick={() => search(token)} disabled={loading}>
              more results
            </button>
          )}

          <button onClick={clearResults} disabled={loading}>
            clear
          </button>

          <button onClick={syncHidden} disabled={loading}>
            sync hidden
          </button>
        </div>

        <div className="row">
          <input
            value={direct}
            onChange={(event) => setDirect(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && vid) {
                void open(vid);
              }
            }}
            placeholder="paste URL or video ID"
          />

          <button onClick={() => open(vid)} disabled={!vid || loading}>
            open by ID
          </button>

          {vid && <span className="badge">{vid}</span>}
        </div>

        <p className="muted small">
          Status: {loading ? "loading... " : ""}
          {status} · hidden {hidden.size}
        </p>
      </section>

      {selected && (
        <section className="panel stack">
          <div className="spread">
            <div>
              <span className="badge">{selected.id}</span>
              <h2>{selected.title}</h2>
              <p className="muted">
                {selected.channelTitle} · {date(selected.publishedAt)} · views{" "}
                {num(selected.viewCount)} · likes {num(selected.likeCount)} ·{" "}
                {selected.duration || "?"}
              </p>
            </div>

            <div className="row">
              <button onClick={() => setSelected(null)}>close</button>
              <button className="danger" onClick={() => hideForever(selected)}>
                hide forever
              </button>
            </div>
          </div>

          <pre>{selected.description || "No description."}</pre>

          <div className="row">
            <a
              className="buttonlike"
              href={`https://www.youtube.com/watch?v=${selected.id}`}
              target="_blank"
              rel="noreferrer"
            >
              open on YouTube
            </a>

            <button
              onClick={() =>
                navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${selected.id}`)
              }
            >
              copy link
            </button>

            <button onClick={() => setPlayer((value) => !value)}>
              {player ? "close player" : "open player"}
            </button>
          </div>

          {player && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${selected.id}`}
              title={selected.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
        </section>
      )}

      <section className="stack">
        <div className="panel spread">
          <div>
            <h2>Results</h2>
            <p className="muted small">
              showing {visibleItems.length}/{items.length}
            </p>
          </div>

          {token && (
            <button onClick={() => search(token)} disabled={loading}>
              more results
            </button>
          )}
        </div>

        {visibleItems.length === 0 && !loading && (
          <div className="panel">
            <p className="muted">
              No visible results. Search above, load more, or hidden videos may be filtering them.
            </p>
          </div>
        )}

        {visibleItems.map((item) => (
          <article className="post stack" key={item.id}>
            <div className="spread">
              <div>
                <h3>{item.title}</h3>
                <p className="muted small">
                  {item.channelTitle} · {date(item.publishedAt)} · {item.id}
                </p>
              </div>

              <div className="row">
                <button onClick={() => open(item.id)} disabled={loading}>
                  open text details
                </button>

                <button className="danger" onClick={() => hideForever(item)} disabled={loading}>
                  hide forever
                </button>
              </div>
            </div>

            <p>{item.description || "No description."}</p>
          </article>
        ))}
      </section>
    </div>
  );
}