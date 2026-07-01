"use client";

import { useMemo, useState } from "react";

type YtItem = { id: string; title: string; channelTitle: string; publishedAt: string; description: string; duration?: string; viewCount?: string; likeCount?: string };

function extractYouTubeId(input: string) {
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] || "";
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || "";
      return url.searchParams.get("v") || "";
    }
  } catch {}
  return "";
}

function plainDate(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export default function YouTubePage() {
  const [query, setQuery] = useState("");
  const [direct, setDirect] = useState("");
  const [items, setItems] = useState<YtItem[]>([]);
  const [selected, setSelected] = useState<YtItem | null>(null);
  const [nextPageToken, setNextPageToken] = useState("");
  const [status, setStatus] = useState("Text-only YouTube browser. No thumbnails/images are loaded.");
  const [loading, setLoading] = useState(false);
  const videoId = useMemo(() => extractYouTubeId(direct), [direct]);

  async function search(page = "") {
    const q = query.trim();
    if (!q) return;
    setLoading(true); setStatus("Searching YouTube text results...");
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&pageToken=${encodeURIComponent(page)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "YouTube search failed");
      setItems(page ? [...items, ...(data.items || [])] : (data.items || []));
      setNextPageToken(data.nextPageToken || "");
      setStatus(`${(page ? items.length : 0) + (data.items?.length || 0)} text results loaded.`);
    } catch (e: any) { setStatus(e.message || "YouTube search failed"); }
    finally { setLoading(false); }
  }

  async function openVideo(id: string) {
    setLoading(true); setStatus("Loading video text details...");
    try {
      const res = await fetch(`/api/youtube/video?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "YouTube video failed");
      setSelected(data);
      setStatus("Loaded. Player is optional below; the browser itself stays text-only.");
    } catch (e: any) { setStatus(e.message || "YouTube video failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="stack">
      <h1>YouTube text browser</h1>
      <p className="muted">Search, browse, and open videos by text only. This page intentionally loads no thumbnails/images.</p>

      <div className="row panel">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search YouTube..." style={{ minWidth: 320 }} onKeyDown={e => { if (e.key === "Enter") search(); }} />
        <button onClick={() => search()} disabled={loading || !query.trim()}>search</button>
        {nextPageToken && <button onClick={() => search(nextPageToken)} disabled={loading}>more results</button>}
        <span className="muted small">{status}</span>
      </div>

      <div className="row panel">
        <input value={direct} onChange={e => setDirect(e.target.value)} placeholder="paste YouTube URL or video ID" style={{ minWidth: 320 }} />
        <button onClick={() => openVideo(videoId)} disabled={!videoId || loading}>open by ID</button>
        {videoId && <span className="badge">{videoId}</span>}
      </div>

      {selected && <section className="panel stack">
        <h2>{selected.title}</h2>
        <p className="muted">{selected.channelTitle} · {plainDate(selected.publishedAt)} · views {selected.viewCount || "?"} · duration {selected.duration || "?"}</p>
        <pre>{selected.description || "No description."}</pre>
        <div className="row">
          <a className="buttonlike" href={`https://www.youtube.com/watch?v=${selected.id}`} target="_blank" rel="noreferrer">open on YouTube</a>
          <button onClick={() => setSelected(null)}>close details</button>
        </div>
        <details>
          <summary>optional embedded player</summary>
          <p className="muted small">This loads the actual video only after you open this section.</p>
          <iframe src={`https://www.youtube-nocookie.com/embed/${selected.id}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
        </details>
      </section>}

      <section className="stack">
        {items.map((item) => <article className="post" key={item.id}>
          <div className="spread">
            <div>
              <h3>{item.title}</h3>
              <p className="muted small">{item.channelTitle} · {plainDate(item.publishedAt)} · {item.id}</p>
            </div>
            <button onClick={() => openVideo(item.id)}>open text details</button>
          </div>
          <p>{item.description || "No description."}</p>
        </article>)}
      </section>
    </div>
  );
}
