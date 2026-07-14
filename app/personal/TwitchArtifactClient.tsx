"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LiveStream = {
  id: string;
  channel: string;
  displayName: string;
  title: string;
  viewers: number;
  startedAt: string;
  language: string;
  thumbnailUrl: string;
  tags: string[];
  mature: boolean;
};

type ApiResult = {
  ok?: boolean;
  configured?: boolean;
  category?: { id: string; name: string; boxArtUrl: string };
  streams?: LiveStream[];
  message?: string;
  fetchedAt?: string;
  error?: string;
};

type SavedChannel = { channel: string; label: string; addedAt: string };

const STORAGE_KEY = "raccoon-personal-twitch-channels-v1";

function parseChannel(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : raw.includes("twitch.tv/") ? `https://${raw}` : "";
    if (withProtocol) {
      const url = new URL(withProtocol);
      if (!/(^|\.)twitch\.tv$/i.test(url.hostname)) return "";
      const first = url.pathname.split("/").filter(Boolean)[0] || "";
      return /^[a-z0-9_]{2,25}$/i.test(first) ? first.toLowerCase() : "";
    }
  } catch {}
  return /^[a-z0-9_]{2,25}$/i.test(raw.replace(/^@/, "")) ? raw.replace(/^@/, "").toLowerCase() : "";
}

function loadSaved(): SavedChannel[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item.channel === "string").slice(0, 100);
  } catch {
    return [];
  }
}

export default function TwitchArtifactClient() {
  const playerShellRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<ApiResult>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SavedChannel[]>([]);
  const [entry, setEntry] = useState("");
  const [label, setLabel] = useState("");
  const [activeChannel, setActiveChannel] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [status, setStatus] = useState("Loading Twitch category…");
  const [parentHost, setParentHost] = useState("localhost");

  useEffect(() => {
    setSaved(loadSaved());
    setParentHost(window.location.hostname || "localhost");
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setStatus("Refreshing Artifact channels…");
    try {
      const response = await fetch("/api/twitch/artifact", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as ApiResult;
      setData(payload);
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Twitch category request failed");
      setStatus(payload.streams?.length ? `${payload.streams.length} Artifact channel${payload.streams.length === 1 ? "" : "s"} live` : payload.message || "No Artifact channels live");
    } catch (error) {
      setData({ ok: false, error: error instanceof Error ? error.message : "Twitch request failed" });
      setStatus(error instanceof Error ? error.message : "Twitch request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 120_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "F12") return; // Never capture browser developer tools.
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "f" && activeChannel) {
        event.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen();
        else void playerShellRef.current?.requestFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeChannel]);

  function persist(next: SavedChannel[]) {
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addChannel() {
    const channel = parseChannel(entry);
    if (!channel) {
      setStatus("Enter a Twitch channel name or a normal twitch.tv/channel link.");
      return;
    }
    const next = [{ channel, label: label.trim() || channel, addedAt: new Date().toISOString() }, ...saved.filter((item) => item.channel !== channel)].slice(0, 100);
    persist(next);
    setEntry("");
    setLabel("");
    setActiveChannel(channel);
    setStatus(`Saved and opened ${channel}`);
  }

  const liveByChannel = useMemo(() => new Map((data.streams || []).map((stream) => [stream.channel.toLowerCase(), stream])), [data.streams]);
  const playerUrl = activeChannel ? `https://player.twitch.tv/?channel=${encodeURIComponent(activeChannel)}&parent=${encodeURIComponent(parentHost)}&autoplay=false` : "";
  const chatUrl = activeChannel ? `https://www.twitch.tv/embed/${encodeURIComponent(activeChannel)}/chat?parent=${encodeURIComponent(parentHost)}&darkpopout` : "";

  return (
    <div className="twitch-artifact stack">
      <section className="panel twitch-intro">
        <div>
          <p className="eyebrow">TWITCH · ARTIFACT</p>
          <h2>Artifact Live</h2>
          <p className="muted">See channels currently streaming in Twitch’s Artifact category, save known channel links, and watch them without leaving the Personal area.</p>
        </div>
        <div className="row twitch-top-actions">
          <a className="buttonlike" href="https://www.twitch.tv/directory/category/artifact" target="_blank" rel="noreferrer">Open category on Twitch</a>
          <button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
      </section>

      <section className="panel stack">
        <div className="spread">
          <div><h3>Live category channels</h3><p className="muted small">{status}</p></div>
          <span className={data.configured ? "badge" : "badge warn"}>{data.configured ? "TWITCH API READY" : "MANUAL MODE"}</span>
        </div>
        {!data.configured && <p className="notice">Automatic category listing needs TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET. Saved channels and embeds work without those credentials.</p>}
        {!!data.error && <p className="notice error">{data.error}</p>}
        <div className="twitch-stream-grid">
          {(data.streams || []).map((stream) => (
            <article className="twitch-stream-card" key={stream.id}>
              <button type="button" className="twitch-thumbnail" onClick={() => setActiveChannel(stream.channel)} aria-label={`Watch ${stream.displayName}`}>
                <img src={stream.thumbnailUrl} alt="" loading="lazy" />
                <span className="twitch-live">LIVE</span>
                <span className="twitch-viewers">{stream.viewers.toLocaleString()} viewers</span>
              </button>
              <div className="stack compact-stack">
                <div className="spread"><strong>{stream.displayName}</strong><span className="badge">{stream.language.toUpperCase()}</span></div>
                <p className="twitch-title">{stream.title || "Untitled stream"}</p>
                <div className="row">
                  <button type="button" onClick={() => setActiveChannel(stream.channel)}>Watch here</button>
                  <a className="buttonlike" href={`https://www.twitch.tv/${stream.channel}`} target="_blank" rel="noreferrer">Twitch</a>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!loading && !(data.streams || []).length && <div className="empty-state"><strong>No Artifact-category channels are live.</strong><span>Use a saved channel below or refresh later.</span></div>}
      </section>

      <section className="panel stack">
        <div><h3>Known channels</h3><p className="muted small">Paste a channel name or link. The list is stored only in this browser.</p></div>
        <div className="twitch-add-grid">
          <label className="stack small">Channel name or Twitch link<input value={entry} onChange={(event) => setEntry(event.target.value)} placeholder="channelname or https://twitch.tv/channelname" onKeyDown={(event) => { if (event.key === "Enter") addChannel(); }} /></label>
          <label className="stack small">Optional label<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Why you saved it" /></label>
          <button type="button" onClick={addChannel}>Save and watch</button>
        </div>
        <div className="saved-channel-list">
          {saved.map((item) => {
            const live = liveByChannel.get(item.channel);
            return <article key={item.channel} className="saved-channel-row">
              <div><strong>{item.label}</strong><span className="muted small">twitch.tv/{item.channel}</span></div>
              <span className={live ? "badge live-badge" : "badge"}>{live ? `${live.viewers.toLocaleString()} LIVE` : "SAVED"}</span>
              <div className="row">
                <button type="button" onClick={() => setActiveChannel(item.channel)}>Watch</button>
                <a className="buttonlike" href={`https://www.twitch.tv/${item.channel}`} target="_blank" rel="noreferrer">Open</a>
                <button type="button" className="danger" onClick={() => persist(saved.filter((savedItem) => savedItem.channel !== item.channel))}>Remove</button>
              </div>
            </article>;
          })}
          {!saved.length && <p className="muted">No saved channels yet.</p>}
        </div>
      </section>

      <section className="panel stack twitch-player-panel">
        <div className="spread">
          <div><h3>Embedded player</h3><p className="muted small">{activeChannel ? `Watching ${activeChannel}` : "Choose a live or saved channel."}</p></div>
          <div className="row">
            {activeChannel && <button type="button" onClick={() => setShowChat((value) => !value)}>{showChat ? "Hide chat" : "Show chat"}</button>}
            {activeChannel && <button type="button" onClick={() => void playerShellRef.current?.requestFullscreen()}>Fullscreen</button>}
            <button type="button" onClick={() => setShowDiagnostics((value) => !value)}>{showDiagnostics ? "Hide diagnostics" : "Diagnostics"}</button>
          </div>
        </div>
        {activeChannel ? (
          <div ref={playerShellRef} className={`twitch-embed-shell ${showChat ? "with-chat" : ""}`}>
            <iframe className="twitch-player-frame" src={playerUrl} title={`${activeChannel} Twitch stream`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            {showChat && <iframe className="twitch-chat-frame" src={chatUrl} title={`${activeChannel} Twitch chat`} />}
          </div>
        ) : <div className="twitch-player-placeholder"><strong>No channel selected</strong><span>Choose “Watch here” or save a channel link.</span></div>}
        <p className="muted small">Keyboard: focus outside a form and press <kbd>F</kbd> for fullscreen. The page deliberately does not capture <kbd>F12</kbd>, so your browser’s developer console remains available. Twitch’s internal iframe is cross-origin, but embed/network errors are still visible in your browser console and the diagnostics below.</p>
        {showDiagnostics && <pre className="twitch-diagnostics">{JSON.stringify({ activeChannel, parentHost, playerUrl, chatEnabled: showChat, apiConfigured: data.configured, liveStreams: data.streams?.length || 0, fetchedAt: data.fetchedAt || null }, null, 2)}</pre>}
      </section>
    </div>
  );
}
