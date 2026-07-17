"use client";

import { useEffect, useMemo, useState } from "react";
import { CompactStatus, IconAction, IconLink } from "@/app/personal/IconAction";

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
function videoKey(id: string) { return `video:${id}`; }
function extract(input: string) {
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) return url.pathname.split("/").filter(Boolean)[1] || "";
      return url.searchParams.get("v") || "";
    }
  } catch {}
  return "";
}
async function readJson(response: Response) { const text = await response.text(); try { return text ? JSON.parse(text) : {}; } catch { return { error: text }; } }
function date(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString(); }
function numberText(value?: string) { const parsed = Number(value); return Number.isFinite(parsed) ? new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(parsed) : "?"; }
function itemLine(item: Item) { return `${item.channelTitle || "?"} · ${date(item.publishedAt) || "?"} · ${item.duration || "?:??"} · ${numberText(item.viewCount)}`; }

export default function YouTubeClient() {
  const [query, setQuery] = useState("");
  const [direct, setDirect] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [nextPageToken, setNextPageToken] = useState("");
  const [status, setStatus] = useState("·");
  const [loading, setLoading] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [help, setHelp] = useState(false);
  const videoId = useMemo(() => extract(direct), [direct]);
  const visibleItems = useMemo(() => items.filter((item) => !hidden.has(videoKey(item.id))), [items, hidden]);

  async function loadHidden() {
    const response = await fetch(`/api/deleted?scope=${SCOPE}`, { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error || "sync failed");
    const next = new Set<string>(Array.isArray(data.keys) ? data.keys.filter((key: unknown) => typeof key === "string") : []);
    setHidden(next);
    return next;
  }

  async function hideForever(item: Item) {
    const key = videoKey(item.id);
    setHidden((old) => new Set(old).add(key));
    if (selected?.id === item.id) { setSelected(null); setPlayerOpen(false); }
    try {
      const response = await fetch("/api/deleted", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: SCOPE, key, label: key }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "hide failed");
      setStatus("×");
    } catch (error) {
      await loadHidden();
      setStatus(error instanceof Error ? error.message : "error");
    }
  }

  async function search(pageToken = "") {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true); setStatus("…");
    try {
      const currentHidden = await loadHidden();
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&pageToken=${encodeURIComponent(pageToken)}`, { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "search failed");
      const newItems: Item[] = Array.isArray(data.items) ? data.items : [];
      setItems((old) => (pageToken ? [...old, ...newItems] : newItems));
      setNextPageToken(data.nextPageToken || "");
      setStatus(String(newItems.filter((item) => !currentHidden.has(videoKey(item.id))).length));
    } catch (error) { setStatus(error instanceof Error ? error.message : "error"); }
    finally { setLoading(false); }
  }

  async function open(idInput: string) {
    const id = extract(idInput) || idInput.trim();
    if (!id || loading) return;
    setLoading(true); setPlayerOpen(false); setStatus("…");
    try {
      const currentHidden = await loadHidden();
      if (currentHidden.has(videoKey(id))) { setStatus("×"); return; }
      const response = await fetch(`/api/youtube/video?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "video failed");
      if (currentHidden.has(videoKey(data.id))) { setStatus("×"); return; }
      setSelected(data); setStatus("1");
    } catch (error) { setStatus(error instanceof Error ? error.message : "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadHidden().catch((error) => setStatus(error.message)); }, []);

  return (
    <div className="personal-tool personal-youtube stack">
      <section className="panel personal-toolbar stack">
        <div className="row personal-icon-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void search(); }} placeholder="⌕" aria-label="Search YouTube" />
          <IconAction label="Search" onClick={() => void search()} disabled={loading || !query.trim()}>⌕</IconAction>
          {nextPageToken && <IconAction label="More results" onClick={() => void search(nextPageToken)} disabled={loading}>+</IconAction>}
          <IconAction label="Clear results" onClick={() => { setItems([]); setSelected(null); setNextPageToken(""); setPlayerOpen(false); setStatus("·"); }} disabled={loading}>×</IconAction>
          <IconAction label="Synchronize hidden videos" onClick={() => void loadHidden().then((items) => setStatus(String(items.size))).catch((error) => setStatus(error.message))} disabled={loading}>⟳</IconAction>
          <IconAction label="Show symbol help" onClick={() => setHelp((value) => !value)}>?</IconAction>
        </div>
        <div className="row personal-icon-row">
          <input value={direct} onChange={(event) => setDirect(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && videoId) void open(videoId); }} placeholder="URL / ID" aria-label="YouTube URL or video ID" />
          <IconAction label="Open video" onClick={() => void open(videoId)} disabled={!videoId || loading}>→</IconAction>
          <CompactStatus busy={loading}>{status}</CompactStatus>
        </div>
        {help && <div className="personal-legend">⌕ search · + more · → open · ▣ player · ↗ YouTube · ⧉ copy · × hide forever · ⟳ sync</div>}
      </section>

      {selected && (
        <section className="panel stack">
          <div className="spread">
            <div className="youtube-meta"><span>{selected.channelTitle}</span><span>{date(selected.publishedAt)}</span><span>{selected.duration || "?:??"}</span><span>▶{numberText(selected.viewCount)}</span><span>♥{numberText(selected.likeCount)}</span></div>
            <div className="row">
              <IconAction label="Close video details" onClick={() => { setSelected(null); setPlayerOpen(false); }}>□</IconAction>
              <IconLink label="Open on YouTube" href={`https://www.youtube.com/watch?v=${selected.id}`} target="_blank" rel="noreferrer">↗</IconLink>
              <IconAction label="Copy YouTube link" onClick={() => void navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${selected.id}`)}>⧉</IconAction>
              <IconAction label={playerOpen ? "Close embedded player" : "Open embedded player"} onClick={() => setPlayerOpen((value) => !value)}>{playerOpen ? "▢" : "▣"}</IconAction>
              <IconAction className="danger" label="Hide this video forever" onClick={() => void hideForever(selected)}>×</IconAction>
            </div>
          </div>
          <h2>{selected.title || "Untitled"}</h2>
          {selected.description && <pre className="youtube-description">{selected.description}</pre>}
          {playerOpen && <iframe className="personal-video-frame" src={`https://www.youtube-nocookie.com/embed/${selected.id}`} title={selected.title || selected.id} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />}
        </section>
      )}

      <section className="stack">
        {visibleItems.map((item) => (
          <article className="post stack" key={item.id}>
            <div className="spread">
              <div className="youtube-meta"><span>{item.channelTitle || "?"}</span><span>{date(item.publishedAt)}</span><span>{item.duration || "?:??"}</span><span>▶{numberText(item.viewCount)}</span></div>
              <div className="row"><IconAction label="Open details" onClick={() => void open(item.id)} disabled={loading}>▶</IconAction><IconLink label="Open on YouTube" href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noreferrer">↗</IconLink><IconAction className="danger" label="Hide this video forever" onClick={() => void hideForever(item)} disabled={loading}>×</IconAction></div>
            </div>
            <h3>{item.title || "Untitled"}</h3>
            {item.description && <p className="youtube-preview">{item.description.slice(0, 700)}</p>}
          </article>
        ))}
        {!loading && visibleItems.length === 0 && <div className="personal-empty">·</div>}
      </section>
    </div>
  );
}
