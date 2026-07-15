"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  parseStreamSource,
  streamPlayerUrl,
  streamPublicUrl,
  type StreamSource,
} from "@/lib/streamSources";

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

type StreamListResult = {
  ok?: boolean;
  sources?: StreamSource[];
  skipped?: number;
  fetchedAt?: string;
  note?: string;
  error?: string;
};

type SavedChannel = { channel: string; label: string; addedAt: string };

const CHANNEL_STORAGE_KEY = "raccoon-personal-twitch-channels-v1";
const SOURCE_STORAGE_KEY = "raccoon-personal-stream-sources-v1";

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

function loadSavedChannels(): SavedChannel[] {
  try {
    const value = JSON.parse(localStorage.getItem(CHANNEL_STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item.channel === "string").slice(0, 100);
  } catch {
    return [];
  }
}

function loadSavedSources(): StreamSource[] {
  try {
    const value = JSON.parse(localStorage.getItem(SOURCE_STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && typeof item.id === "string" && typeof item.value === "string")
      .map((item) => ({ ...item, origin: "manual" as const }))
      .slice(0, 100);
  } catch {
    return [];
  }
}

function providerLabel(provider: StreamSource["provider"]) {
  if (provider === "twitch") return "TWITCH";
  if (provider === "kick") return "KICK";
  if (provider === "angelthump") return "ANGELTHUMP";
  return "CUSTOM EMBED";
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

  const [savedSources, setSavedSources] = useState<StreamSource[]>([]);
  const [gistSources, setGistSources] = useState<StreamSource[]>([]);
  const [sourceEntry, setSourceEntry] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [activeSourceId, setActiveSourceId] = useState("");
  const [sourceStatus, setSourceStatus] = useState("Loading the optional safe stream list…");
  const [sourceLoading, setSourceLoading] = useState(false);
  const [playerNonce, setPlayerNonce] = useState(0);

  useEffect(() => {
    setSaved(loadSavedChannels());
    setSavedSources(loadSavedSources());
    setParentHost(window.location.hostname || "localhost");
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setStatus("Refreshing Artifact channels…");
    try {
      const response = await fetch("/api/twitch/artifact", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as ApiResult;
      setData(payload);
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Twitch category request failed");
      setStatus(
        payload.streams?.length
          ? `${payload.streams.length} Artifact channel${payload.streams.length === 1 ? "" : "s"} live`
          : payload.message || "No Artifact channels live",
      );
    } catch (error) {
      setData({ ok: false, error: error instanceof Error ? error.message : "Twitch request failed" });
      setStatus(error instanceof Error ? error.message : "Twitch request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSafeStreamList = useCallback(async () => {
    setSourceLoading(true);
    setSourceStatus("Loading safe stream-source data…");
    try {
      const response = await fetch("/api/twitch/stream-list", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as StreamListResult;
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Stream list request failed");
      setGistSources(Array.isArray(payload.sources) ? payload.sources : []);
      const count = payload.sources?.length || 0;
      setSourceStatus(
        `${count} validated source${count === 1 ? "" : "s"} loaded${payload.skipped ? ` · ${payload.skipped} unsafe or unsupported line${payload.skipped === 1 ? "" : "s"} ignored` : ""}`,
      );
    } catch (error) {
      setGistSources([]);
      setSourceStatus(`${error instanceof Error ? error.message : "Stream list failed"}. Manual sources still work.`);
    } finally {
      setSourceLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshSafeStreamList();
    const timer = window.setInterval(() => void refresh(), 120_000);
    return () => window.clearInterval(timer);
  }, [refresh, refreshSafeStreamList]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "F12") return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button, [contenteditable='true']")) return;
      if (event.key.toLowerCase() === "f" && (activeChannel || activeSourceId)) {
        event.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen();
        else void playerShellRef.current?.requestFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeChannel, activeSourceId]);

  function persistChannels(next: SavedChannel[]) {
    setSaved(next);
    localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(next));
  }

  function persistSources(next: StreamSource[]) {
    const normalized = next.map((source) => ({ ...source, origin: "manual" as const })).slice(0, 100);
    setSavedSources(normalized);
    localStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(normalized));
  }

  function watchTwitchChannel(channel: string) {
    setActiveChannel(channel);
    setActiveSourceId("");
    setPlayerNonce((value) => value + 1);
  }

  function addChannel() {
    const channel = parseChannel(entry);
    if (!channel) {
      setStatus("Enter a Twitch channel name or a normal twitch.tv/channel link.");
      return;
    }
    const next = [
      { channel, label: label.trim() || channel, addedAt: new Date().toISOString() },
      ...saved.filter((item) => item.channel !== channel),
    ].slice(0, 100);
    persistChannels(next);
    setEntry("");
    setLabel("");
    watchTwitchChannel(channel);
    setStatus(`Saved and opened ${channel}`);
  }

  function addSource() {
    const parsed = parseStreamSource(sourceEntry, {
      label: sourceLabel,
      origin: "manual",
      allowCustomEmbed: true,
    });
    if (!parsed) {
      setSourceStatus("Enter a Twitch/Kick channel or a public HTTPS embed URL. Local and unsafe URLs are blocked.");
      return;
    }
    persistSources([parsed, ...savedSources.filter((item) => item.id !== parsed.id)]);
    setSourceEntry("");
    setSourceLabel("");
    setActiveSourceId(parsed.id);
    setPlayerNonce((value) => value + 1);
    setSourceStatus(`Saved and switched video to ${parsed.label}. Twitch chat stays on ${activeChannel || "the selected Twitch channel"}.`);
  }

  const allSources = useMemo(() => {
    const byId = new Map<string, StreamSource>();
    for (const source of savedSources) byId.set(source.id, source);
    for (const source of gistSources) if (!byId.has(source.id)) byId.set(source.id, source);
    return [...byId.values()];
  }, [savedSources, gistSources]);

  const selectedSource = useMemo(
    () => allSources.find((source) => source.id === activeSourceId) || null,
    [activeSourceId, allSources],
  );
  const liveByChannel = useMemo(
    () => new Map((data.streams || []).map((stream) => [stream.channel.toLowerCase(), stream])),
    [data.streams],
  );
  const nativePlayerUrl = activeChannel
    ? `https://player.twitch.tv/?channel=${encodeURIComponent(activeChannel)}&parent=${encodeURIComponent(parentHost)}&autoplay=false`
    : "";
  const playerUrl = selectedSource ? streamPlayerUrl(selectedSource, parentHost) : nativePlayerUrl;
  const chatUrl = activeChannel
    ? `https://www.twitch.tv/embed/${encodeURIComponent(activeChannel)}/chat?parent=${encodeURIComponent(parentHost)}&darkpopout`
    : "";
  const playerName = selectedSource ? selectedSource.label : activeChannel ? activeChannel : "No source";
  const customSandbox = selectedSource?.provider === "embed" ? "allow-scripts allow-forms allow-popups allow-presentation" : undefined;

  return (
    <div className="twitch-artifact stack">
      <section className="panel twitch-intro">
        <div>
          <p className="eyebrow">TWITCH · ARTIFACT</p>
          <h2>Artifact Live</h2>
          <p className="muted">See Artifact-category channels, keep a Twitch chat open, and switch only the video to another validated Twitch, Kick, AngelThump, or embeddable HTTPS source.</p>
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
              <button type="button" className="twitch-thumbnail" onClick={() => watchTwitchChannel(stream.channel)} aria-label={`Watch ${stream.displayName}`}>
                <img src={stream.thumbnailUrl} alt="" loading="lazy" />
                <span className="twitch-live">LIVE</span>
                <span className="twitch-viewers">{stream.viewers.toLocaleString()} viewers</span>
              </button>
              <div className="stack compact-stack">
                <div className="spread"><strong>{stream.displayName}</strong><span className="badge">{stream.language.toUpperCase()}</span></div>
                <p className="twitch-title">{stream.title || "Untitled stream"}</p>
                <div className="row">
                  <button type="button" onClick={() => watchTwitchChannel(stream.channel)}>Watch here</button>
                  <a className="buttonlike" href={`https://www.twitch.tv/${stream.channel}`} target="_blank" rel="noreferrer">Twitch</a>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!loading && !(data.streams || []).length && <div className="empty-state"><strong>No Artifact-category channels are live.</strong><span>Use a saved channel below or refresh later.</span></div>}
      </section>

      <section className="panel stack">
        <div><h3>Known Twitch channels</h3><p className="muted small">This channel supplies the normal Twitch video and, when enabled, the Twitch chat that remains beside replacement video sources.</p></div>
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
                <button type="button" onClick={() => watchTwitchChannel(item.channel)}>Watch</button>
                <a className="buttonlike" href={`https://www.twitch.tv/${item.channel}`} target="_blank" rel="noreferrer">Open</a>
                <button type="button" className="danger" onClick={() => persistChannels(saved.filter((savedItem) => savedItem.channel !== item.channel))}>Remove</button>
              </div>
            </article>;
          })}
          {!saved.length && <p className="muted">No saved channels yet.</p>}
        </div>
      </section>

      <section className="panel stack stream-switcher-panel">
        <div className="spread">
          <div>
            <h3>Video source switcher</h3>
            <p className="muted small">This safely recreates the Gist’s useful behavior. It never runs <code>eval</code>; the remote list is treated only as validated names and URLs.</p>
          </div>
          <button type="button" onClick={() => void refreshSafeStreamList()} disabled={sourceLoading}>{sourceLoading ? "Loading…" : "Reload safe list"}</button>
        </div>
        <p className="notice">{sourceStatus}</p>
        <div className="stream-source-add-grid">
          <label className="stack small">Channel or embed URL<input value={sourceEntry} onChange={(event) => setSourceEntry(event.target.value)} placeholder="Twitch name, Kick link, or public https:// embed URL" onKeyDown={(event) => { if (event.key === "Enter") addSource(); }} /></label>
          <label className="stack small">Optional label<input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} placeholder="Stream name" /></label>
          <button type="button" onClick={addSource}>Save source</button>
        </div>
        <div className="stream-source-toolbar">
          <button type="button" className={!selectedSource ? "active" : ""} onClick={() => { setActiveSourceId(""); setPlayerNonce((value) => value + 1); }} disabled={!activeChannel}>Original Twitch video</button>
          <span className="muted small">The Twitch chat stays on <strong>{activeChannel || "no channel selected"}</strong> while another video source is active.</span>
        </div>
        <div className="stream-source-grid">
          {allSources.map((source) => {
            const isSaved = savedSources.some((item) => item.id === source.id);
            const active = source.id === activeSourceId;
            return (
              <article className={`stream-source-card ${active ? "active" : ""}`} key={source.id}>
                <div className="spread">
                  <span className="badge">{providerLabel(source.provider)}</span>
                  <span className="muted tiny">{source.origin === "gist" ? "SAFE LIST" : "SAVED"}</span>
                </div>
                <div><strong>{source.label}</strong>{source.description && <p className="muted small">{source.description}</p>}</div>
                <div className="row">
                  <button type="button" onClick={() => { setActiveSourceId(source.id); setPlayerNonce((value) => value + 1); }}>Use video</button>
                  {source.provider === "twitch" && <button type="button" onClick={() => { setActiveChannel(source.value); setShowChat(true); }}>Use its chat</button>}
                  <a className="buttonlike" href={streamPublicUrl(source)} target="_blank" rel="noreferrer">Open</a>
                  {!isSaved ? (
                    <button type="button" onClick={() => persistSources([source, ...savedSources.filter((item) => item.id !== source.id)])}>Save</button>
                  ) : (
                    <button type="button" className="danger" onClick={() => { persistSources(savedSources.filter((item) => item.id !== source.id)); if (active) setActiveSourceId(""); }}>Remove</button>
                  )}
                </div>
              </article>
            );
          })}
          {!allSources.length && <div className="empty-state"><strong>No replacement sources loaded.</strong><span>Add one manually; the normal Twitch player still works.</span></div>}
        </div>
        <p className="muted small">A completely arbitrary URL cannot always be embedded: websites may block iframes with their own security policy. Custom URLs are sandboxed and only public HTTPS addresses are accepted.</p>
      </section>

      <section className="panel stack twitch-player-panel">
        <div className="spread">
          <div>
            <h3>Embedded player</h3>
            <p className="muted small">Video: {playerName} · Chat: {activeChannel || "off"}</p>
          </div>
          <div className="row">
            {activeChannel && <button type="button" onClick={() => setShowChat((value) => !value)}>{showChat ? "Hide chat" : "Show chat"}</button>}
            {playerUrl && <button type="button" onClick={() => setPlayerNonce((value) => value + 1)}>Reload video</button>}
            {playerUrl && <button type="button" onClick={() => void playerShellRef.current?.requestFullscreen()}>Fullscreen</button>}
            <button type="button" onClick={() => setShowDiagnostics((value) => !value)}>{showDiagnostics ? "Hide diagnostics" : "Diagnostics"}</button>
          </div>
        </div>
        {playerUrl ? (
          <div ref={playerShellRef} className={`twitch-embed-shell ${showChat && activeChannel ? "with-chat" : ""}`}>
            <iframe
              key={`${playerUrl}-${playerNonce}`}
              className="twitch-player-frame"
              src={playerUrl}
              title={`${playerName} stream`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              sandbox={customSandbox}
              referrerPolicy="strict-origin-when-cross-origin"
            />
            {showChat && activeChannel && <iframe className="twitch-chat-frame" src={chatUrl} title={`${activeChannel} Twitch chat`} />}
          </div>
        ) : <div className="twitch-player-placeholder"><strong>No video selected</strong><span>Choose a Twitch channel or a replacement source.</span></div>}
        <p className="muted small">Keyboard: focus outside a form and press <kbd>F</kbd> for fullscreen. <kbd>F12</kbd> is never captured, so normal browser developer tools remain available. Cross-origin player internals cannot be inspected by the dashboard, but frame and network errors remain visible in the console.</p>
        {showDiagnostics && <pre className="twitch-diagnostics">{JSON.stringify({ activeChannel, activeSource: selectedSource, parentHost, playerUrl, chatUrl: showChat ? chatUrl : null, apiConfigured: data.configured, liveStreams: data.streams?.length || 0, fetchedAt: data.fetchedAt || null }, null, 2)}</pre>}
      </section>
    </div>
  );
}
