"use client";

import { useEffect, useMemo, useState } from "react";

type Thread = { no: number; sub?: string; name?: string; now?: string; replies?: number; images?: number; com?: string; tim?: number; ext?: string; filename?: string; page?: number; sticky?: boolean; closed?: boolean };
type Post = Thread & { resto: number };
type Block = { board: string; expires_at: string | null; created_at: string };
type ImageState = { url: string; label: string; kind: "image" | "video" } | null;
const SCOPE = "chan";

function cleanBoard(v: string) { return v.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase(); }
function threadKey(board: string, no: number) { return `thread:${board}:${no}`; }
function postKey(board: string, no: number) { return `post:${board}:${no}`; }
function label(x: { tim?: number; ext?: string; filename?: string }) { return x.tim && x.ext ? `${x.filename || x.tim}${x.ext}` : ""; }
function mediaUrl(board: string, x: { tim?: number; ext?: string }) { return x.tim && x.ext ? `/api/chan/image?board=${encodeURIComponent(board)}&tim=${x.tim}&ext=${encodeURIComponent(x.ext)}` : ""; }
async function json(res: Response) { const text = await res.text(); try { return text ? JSON.parse(text) : {}; } catch { return { error: text }; } }
function blockText(b: Block) { return b.expires_at ? `until ${new Date(b.expires_at).toLocaleString()}` : "permanent"; }

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
  const [image, setImage] = useState<ImageState>(null);

  const blockedBoards = useMemo(() => new Set(blocks.map((b) => b.board)), [blocks]);
  const activeBlocked = blockedBoards.has(activeBoard);

  async function loadDeleted() {
    const res = await fetch(`/api/deleted?scope=${SCOPE}`, { cache: "no-store" });
    const data = await json(res); if (!res.ok) throw new Error(data.error || "deleted load failed");
    setDeleted(new Set(Array.isArray(data.keys) ? data.keys : []));
  }

  async function loadBlocks() {
    const res = await fetch("/api/chan/blocks", { cache: "no-store" });
    const data = await json(res); if (!res.ok) throw new Error(data.error || "blocks failed");
    setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
  }

  async function boot() {
    setLoading(true);
    try { await Promise.all([loadDeleted(), loadBlocks()]); await loadCatalog("g", false); }
    catch (e: any) { setStatus(e.message || "boot failed"); }
    finally { setLoading(false); }
  }

  async function loadCatalog(raw = boardInput, manageLoading = true) {
    const board = cleanBoard(raw || "g");
    if (!board) return setStatus("empty board");
    if (blockedBoards.has(board)) return setStatus(`/${board}/ is disabled for your account.`);
    if (manageLoading) setLoading(true);
    setImage(null); setSelected(null); setPosts([]); setStatus(`loading /${board}/...`);
    try {
      await Promise.all([loadDeleted(), loadBlocks()]);
      const res = await fetch(`/api/chan/catalog?board=${encodeURIComponent(board)}`, { cache: "no-store" });
      const data = await json(res); if (!res.ok) throw new Error(data.error || "catalog failed");
      setActiveBoard(board); setBoardInput(board); setThreads(Array.isArray(data.threads) ? data.threads : []); setStatus(`loaded /${board}/ · ${data.count || 0} threads`);
    } catch (e: any) { setStatus(e.message || "catalog failed"); setThreads([]); }
    finally { if (manageLoading) setLoading(false); }
  }

  async function openThread(t: Thread) {
    if (activeBlocked) return setStatus(`/${activeBoard}/ is disabled.`);
    setSelected(t); setPosts([]); setImage(null); setLoading(true); setStatus(`opening #${t.no}...`);
    try {
      await loadDeleted();
      const res = await fetch(`/api/chan/thread?board=${activeBoard}&no=${t.no}`, { cache: "no-store" });
      const data = await json(res); if (!res.ok) throw new Error(data.error || "thread failed");
      setPosts(Array.isArray(data.posts) ? data.posts : []); setStatus(`thread #${t.no} · ${data.count || 0} posts`);
    } catch (e: any) { setStatus(e.message || "thread failed"); }
    finally { setLoading(false); }
  }

  async function remove(key: string, why: string) {
    setDeleted((old) => new Set([...old, key]));
    try {
      const res = await fetch("/api/deleted", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: SCOPE, key, label: why }) });
      const data = await json(res); if (!res.ok) throw new Error(data.error || "delete failed");
      if (selected && key === threadKey(activeBoard, selected.no)) { setSelected(null); setPosts([]); setImage(null); }
      setStatus(`deleted: ${why}`);
    } catch (e: any) { setStatus(e.message || "delete failed"); await loadDeleted(); }
  }

  async function disableBoard(mode: "1" | "7" | "30" | "permanent") {
    const board = cleanBoard(boardInput || activeBoard);
    if (!board) return;
    setLoading(true); setStatus(`disabling /${board}/...`);
    try {
      const res = await fetch("/api/chan/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ board, mode }) });
      const data = await json(res); if (!res.ok) throw new Error(data.error || "disable failed");
      setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
      if (activeBoard === board) { setThreads([]); setSelected(null); setPosts([]); setImage(null); }
      setStatus(`/${board}/ disabled ${mode === "permanent" ? "permanently" : `for ${mode} day(s)`}`);
    } catch (e: any) { setStatus(e.message || "disable failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { boot(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const shownThreads = useMemo(() => {
    const q = search.toLowerCase().trim();
    return threads.filter((t) => !deleted.has(threadKey(activeBoard, t.no))).filter((t) => !q || `${t.no} ${t.sub || ""} ${t.name || ""} ${t.com || ""}`.toLowerCase().includes(q));
  }, [threads, deleted, activeBoard, search]);
  const shownPosts = useMemo(() => posts.filter((p) => !deleted.has(postKey(activeBoard, p.no))), [posts, deleted, activeBoard]);

  function viewMedia(x: Thread | Post) {
    const url = mediaUrl(activeBoard, x); const name = label(x); if (!url || !name) return;
    const kind = /\.(webm|mp4)$/i.test(name) ? "video" : "image";
    setImage({ url, label: name, kind });
  }

  return <div className="stack">
    <section className="panel stack">
      <div className="spread"><div><p className="badge">/{activeBoard}/</p><h1>4chan viewport</h1><p className="muted">Read-only. Per-user deletes and per-user board disables. No thumbnails load unless you click a file.</p></div><div className="row"><button onClick={() => loadCatalog(activeBoard)} disabled={loading || activeBlocked}>reload</button><button onClick={() => { loadDeleted(); loadBlocks(); }}>sync</button></div></div>
      <div className="row"><input value={boardInput} onChange={(e) => setBoardInput(cleanBoard(e.target.value))} onKeyDown={(e) => { if (e.key === "Enter") loadCatalog(boardInput); }} placeholder="board e.g. g" /><button onClick={() => loadCatalog(boardInput)} disabled={loading}>load board</button><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="filter loaded threads" /></div>
      <div className="row"><button className="warn" onClick={() => disableBoard("1")}>disable board 1 day</button><button className="warn" onClick={() => disableBoard("7")}>disable 7 days</button><button className="warn" onClick={() => disableBoard("30")}>disable 30 days</button><button className="danger" onClick={() => disableBoard("permanent")}>disable permanent</button></div>
      <p className="muted small">Status: {loading ? "loading... " : ""}{status}</p>
    </section>
    {blocks.length > 0 && <section className="panel"><h2>Disabled boards</h2><div className="row">{blocks.map((b) => <span className="badge warn" key={b.board}>/{b.board}/ {blockText(b)}</span>)}</div></section>}
    <div className="two"><section className="stack"><div className="panel spread"><div><h2>Threads</h2><p className="muted small">{shownThreads.length}/{threads.length}</p></div><span className="badge">catalog</span></div>{shownThreads.map((t) => <article className="thread stack" key={t.no}><div className="spread"><div className="row"><button onClick={() => openThread(t)}>open #{t.no}</button>{t.sticky && <span className="badge warn">sticky</span>}{t.closed && <span className="badge danger">closed</span>}</div><button className="danger" onClick={() => remove(threadKey(activeBoard, t.no), `${activeBoard} thread ${t.no}`)}>delete thread</button></div><div><h3>{t.sub || "(no subject)"}</h3><p className="muted small">{t.name || "Anonymous"} · replies {t.replies ?? 0} · images {t.images ?? 0} · page {t.page ?? "?"}</p></div>{t.tim && <div className="row"><button onClick={() => viewMedia(t)}>view {label(t)}</button></div>}<div className="html" dangerouslySetInnerHTML={{ __html: t.com || "" }} /></article>)}</section><section className="stack viewer">{image && <div className="panel stack"><div className="spread"><h2>{image.label}</h2><button onClick={() => setImage(null)}>close</button></div>{image.kind === "video" ? <video className="media" src={image.url} controls /> : <img className="fullimg" src={image.url} alt={image.label} />}<a className="buttonlike" href={image.url} target="_blank" rel="noreferrer">open file tab</a></div>}<div className="panel stack"><h2>{selected ? `Thread #${selected.no}` : "Open a thread"}</h2>{selected && <button onClick={() => openThread(selected)}>reload thread</button>}</div>{shownPosts.map((p) => <article className="post stack" key={p.no}><div className="spread"><div><span className="badge">#{p.no}</span> <span className="muted small">{p.name || "Anonymous"} · {p.now || ""}</span></div><button className="danger" onClick={() => remove(postKey(activeBoard, p.no), `${activeBoard} post ${p.no}`)}>delete post</button></div>{p.tim && <button onClick={() => viewMedia(p)}>view {label(p)}</button>}<div className="html" dangerouslySetInnerHTML={{ __html: p.com || "" }} /></article>)}</section></div>
  </div>;
}
