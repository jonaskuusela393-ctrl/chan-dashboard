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

function extract(input: string) {
  const raw = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

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
  const nextDate = new Date(value);

  return Number.isNaN(nextDate.getTime()) ? "" : nextDate.toLocaleDateString();
}

function num(value?: string) {
  const nextNumber = Number(value);

  return Number.isFinite(nextNumber)
    ? new Intl.NumberFormat(undefined, {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(nextNumber)
    : "?";
}

function videoKey(id: string) {
  return `video:${id}`;
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
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("text-only, no thumbnails");
  const [loading, setLoading] = useState(false);
  const [player, setPlayer] = useState(false);

  const videoId = useMemo(() => extract(direct), [direct]);

  const shownItems = useMemo(() => {
    return items.filter((item) => !hidden.has(videoKey(item.id)));
  }, [items, hidden]);

  async function fetchHidden() {
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

  async function search(page = "") {
    if (!query.trim() || loading) return;

    setLoading(true);
    setStatus(page ? "loading more..." : "searching...");

    try {
      await fetchHidden();

      const response = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(query.trim())}&pageToken=${encodeURIComponent(page)}`,
        { cache: "no-store" }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "search failed");
      }

      const newItems: Item[] = Array.isArray(data.items) ? data.items : [];

      setItems((oldItems) => (page ? [...oldItems, ...newItems] : newItems));
      setToken(data.nextPageToken || "");
      setSelected(null);
      setPlayer(false);
      setStatus(`${page ? shownItems.length + newItems.length : newItems.length} results loaded`);
    } catch (error) {
      setStatus(errorMessage(error, "search failed"));
    } finally {
      setLoading(false);
    }
  }

  async function open(id: string) {
    if (!id || loading) return;

    const key = videoKey(id);

    if (hidden.has(key)) {
      setStatus("that video is hidden forever");
      return;
    }

    setLoading(true);
    setPlayer(false);
    setStatus("loading video text...");

    try {
      const response = await fetch(`/api/youtube/video?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "video failed");
      }

      setSelected(data);
      setStatus("video details loaded");
    } catch (error) {
      setStatus(errorMessage(error, "video failed"));
    } finally {
      setLoading(false);
    }
  }

  async function hideVideo(item: Item) {
    const key = videoKey(item.id);

    setHidden((oldHidden) => {
      const nextHidden = new Set(oldHidden);
      nextHidden.add(key);
      return nextHidden;
    });

    setItems((oldItems) => oldItems.filter((oldItem) => oldItem.id !== item.id));

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
          label: `${item.channelTitle || "YouTube"} - ${item.title || item.id}`,
        }),
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "hide failed");
      }

      setStatus(`hidden forever: ${item.title || item.id}`);
    } catch (error) {
      setStatus(errorMessage(error, "hide failed"));
      await fetchHidden().catch(() => undefined);
    }
  }

  useEffect(() => {
    fetchHidden()
      .then((nextHidden) => setStatus(`text-only, no thumbnails · ${nextHidden.size} hidden forever`))
      .catch((error) => setStatus(errorMessage(error, "hidden videos sync failed")));
  }, []);

  return (
    <div className="stack">
      <section className="panel stack">
        <p className="badge">YOUTUBE TEXT</p>
        <h1>YouTube text browser</h1>
        <p className="muted">
          No thumbnails are loaded. Hidden videos stay hidden forever for your account.
          The player only loads after pressing open player.
        </p>

        <div className="row controls-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void search();
            }}
            placeholder="search YouTube"
          />

          <button onClick={() => search()} disabled={loading || !query.trim()}>
            search
          </button>

          {token && (
            <button onClick={() => search(token)} disabled={loading}>
              more
            </button>
          )}

          <button
            aria-label="clear"
            title="clear"
            onClick={() => {
              setItems([]);
              setSelected(null);
              setToken("");
              setPlayer(false);
            }}
          >
            ×
          </button>
        </div>

        <div className="row controls-row">
          <input
            value={direct}
            onChange={(event) => setDirect(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && videoId) void open(videoId);
            }}
            placeholder="paste URL or video ID"
          />

          <button onClick={() => open(videoId)} disabled={!videoId || loading}>
            open by ID
          </button>

          {videoId && <span className="badge">{videoId}</span>}
        </div>

        <p className="muted small">
          Status: {loading ? "loading... " : ""}
          {status}
        </p>
      </section>

      {selected && (
        <section className="panel stack">
          <div className="spread">
            <div className="minw0">
              <span className="badge">{selected.id}</span>
              <h2>{selected.title}</h2>
              <p className="muted">
                {selected.channelTitle} · {date(selected.publishedAt)} · views {num(selected.viewCount)} · likes{" "}
                {num(selected.likeCount)} · {selected.duration || "?"}
              </p>
            </div>

            <div className="row action-row compact-actions">
              <button
                className="danger icon-button"
                aria-label="hide video forever"
                title="hide video forever"
                onClick={() => hideVideo(selected)}
              >
                ×
              </button>

              <button aria-label="close" title="close" className="icon-button" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
          </div>

          <pre>{selected.description || "No description."}</pre>

          <div className="row controls-row">
            <a
              className="buttonlike"
              href={`https://www.youtube.com/watch?v=${selected.id}`}
              target="_blank"
              rel="noreferrer"
            >
              open on YouTube
            </a>

            <button onClick={() => navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${selected.id}`)}>
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
              showing {shownItems.length}/{items.length} · hidden forever {hidden.size}
            </p>
          </div>

          {token && <button onClick={() => search(token)}>more</button>}
        </div>

        {shownItems.length === 0 && !loading && (
          <div className="panel">
            <p className="muted">No videos shown. Search, load more, or your results may be hidden forever.</p>
          </div>
        )}

        {shownItems.map((item) => (
          <article className="post stack" key={item.id}>
            <div className="spread">
              <div className="minw0">
                <h3>{item.title}</h3>
                <p className="muted small">
                  {item.channelTitle} · {date(item.publishedAt)} · {item.id} · {item.duration || "?"}
                </p>
              </div>

              <div className="row action-row compact-actions">
                <button onClick={() => open(item.id)}>open text</button>
                <button
                  className="danger icon-button"
                  aria-label="hide forever"
                  title="hide forever"
                  onClick={() => hideVideo(item)}
                >
                  ×
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
