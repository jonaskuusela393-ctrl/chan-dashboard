"use client";

import { useMemo, useState } from "react";

type YtItem = {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  duration?: string;
  viewCount?: string;
  likeCount?: string;
};

function extractYouTubeId(input: string) {
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
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/").filter(Boolean)[1] || "";
      }

      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/").filter(Boolean)[1] || "";
      }

      return url.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }

  return "";
}

function plainDate(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString();
}

function compactNumber(value?: string) {
  if (!value) return "?";

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

async function readJson(response: Response) {
  const text = await response.text();

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

export default function YouTubePage() {
  const [query, setQuery] = useState("");
  const [direct, setDirect] = useState("");

  const [items, setItems] = useState<YtItem[]>([]);
  const [selected, setSelected] = useState<YtItem | null>(null);

  const [nextPageToken, setNextPageToken] = useState("");
  const [status, setStatus] = useState(
    "Text-only YouTube browser. No thumbnails or images are loaded."
  );

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);

  const videoId = useMemo(() => extractYouTubeId(direct), [direct]);
  const loading = loadingSearch || loadingVideo;

  async function search(pageToken = "") {
    const q = query.trim();

    if (!q || loadingSearch) {
      return;
    }

    setLoadingSearch(true);
    setStatus(pageToken ? "Loading more text results..." : "Searching YouTube text results...");

    try {
      const response = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(q)}&pageToken=${encodeURIComponent(
          pageToken
        )}`,
        { cache: "no-store" }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "YouTube search failed. Check YOUTUBE_API_KEY in Vercel."
        );
      }

      const newItems = Array.isArray(data.items) ? data.items : [];

      setItems((oldItems) => {
        const merged = pageToken ? [...oldItems, ...newItems] : newItems;
        setStatus(
          `${merged.length} text result${merged.length === 1 ? "" : "s"} loaded.`
        );
        return merged;
      });

      setNextPageToken(data.nextPageToken || "");
    } catch (error) {
      setStatus(errorMessage(error, "YouTube search failed"));
    } finally {
      setLoadingSearch(false);
    }
  }

  async function openVideo(idInput: string) {
    const id = extractYouTubeId(idInput) || idInput.trim();

    if (!id || loadingVideo) {
      return;
    }

    setLoadingVideo(true);
    setStatus("Loading video text details...");
    setPlayerOpen(false);

    try {
      const response = await fetch(`/api/youtube/video?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "YouTube video failed. Check YOUTUBE_API_KEY in Vercel."
        );
      }

      setSelected(data);
      setStatus("Video text details loaded. Player is closed until you open it.");
    } catch (error) {
      setStatus(errorMessage(error, "YouTube video failed"));
    } finally {
      setLoadingVideo(false);
    }
  }

  function clearResults() {
    setItems([]);
    setSelected(null);
    setNextPageToken("");
    setPlayerOpen(false);
    setStatus("Cleared results.");
  }

  async function copyText(value: string, label = "Copied") {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(label);
    } catch {
      setStatus("Could not copy.");
    }
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">YOUTUBE TEXT</p>
            <h1>YouTube text browser</h1>
            <p className="muted">
              Search, browse, and open YouTube videos as text. This page loads no
              thumbnails or images. The optional player only loads when you press
              open player.
            </p>
          </div>

          <div className="row">
            <button onClick={clearResults} disabled={loading || items.length === 0}>
              clear results
            </button>
          </div>
        </div>

        <div className="row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="search YouTube..."
            aria-label="search YouTube"
            style={{ minWidth: 280 }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                search();
              }
            }}
          />

          <button onClick={() => search()} disabled={loadingSearch || !query.trim()}>
            search
          </button>

          {nextPageToken && (
            <button onClick={() => search(nextPageToken)} disabled={loadingSearch}>
              more results
            </button>
          )}
        </div>

        <div className="row">
          <input
            value={direct}
            onChange={(event) => setDirect(event.target.value)}
            placeholder="paste YouTube URL or video ID"
            aria-label="YouTube URL or video ID"
            style={{ minWidth: 280 }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && videoId) {
                openVideo(videoId);
              }
            }}
          />

          <button onClick={() => openVideo(videoId)} disabled={!videoId || loadingVideo}>
            open by ID
          </button>

          {videoId && (
            <button onClick={() => copyText(videoId, "Copied video ID.")}>
              copy ID
            </button>
          )}

          {videoId && <span className="badge">{videoId}</span>}
        </div>

        <div className="panel">
          <p className="muted small">
            Status: {loading ? "loading... " : ""}
            {status}
          </p>
        </div>
      </section>

      {selected && (
        <section className="panel stack">
          <div className="spread">
            <div>
              <p className="badge">{selected.id}</p>
              <h2>{selected.title || "Untitled video"}</h2>

              <p className="muted">
                {selected.channelTitle || "unknown channel"} ·{" "}
                {plainDate(selected.publishedAt) || "unknown date"} · views{" "}
                {compactNumber(selected.viewCount)} · likes{" "}
                {compactNumber(selected.likeCount)} · duration{" "}
                {selected.duration || "?"}
              </p>
            </div>

            <button onClick={() => setSelected(null)}>close details</button>
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
                copyText(
                  `https://www.youtube.com/watch?v=${selected.id}`,
                  "Copied YouTube link."
                )
              }
            >
              copy link
            </button>

            <button onClick={() => setPlayerOpen((value) => !value)}>
              {playerOpen ? "close player" : "open player"}
            </button>
          </div>

          {playerOpen && (
            <div className="stack">
              <p className="muted small">
                Player loaded now. Before this, the page stayed text-only.
              </p>

              <iframe
                src={`https://www.youtube-nocookie.com/embed/${selected.id}`}
                title={selected.title || selected.id}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}
        </section>
      )}

      <section className="stack">
        <div className="panel spread">
          <div>
            <h2>Results</h2>
            <p className="muted small">
              showing {items.length} result{items.length === 1 ? "" : "s"}
            </p>
          </div>

          {nextPageToken && (
            <button onClick={() => search(nextPageToken)} disabled={loadingSearch}>
              more results
            </button>
          )}
        </div>

        {items.length === 0 && !loadingSearch && (
          <div className="panel">
            <p className="muted">
              No results loaded. Search above. Make sure `YOUTUBE_API_KEY` is set
              in Vercel.
            </p>
          </div>
        )}

        {items.map((item) => (
          <article className="post stack" key={item.id}>
            <div className="spread">
              <div>
                <h3>{item.title || "Untitled video"}</h3>

                <p className="muted small">
                  {item.channelTitle || "unknown channel"} ·{" "}
                  {plainDate(item.publishedAt) || "unknown date"} · {item.id}
                </p>
              </div>

              <div className="row">
                <button onClick={() => openVideo(item.id)} disabled={loadingVideo}>
                  open text details
                </button>

                <button onClick={() => copyText(item.id, "Copied video ID.")}>
                  copy ID
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