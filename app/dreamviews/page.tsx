"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteForever, loadDeleted } from "@/lib/deletedClient";

type Forum = { title: string; path: string; threads?: string; posts?: string };
type Thread = { title: string; path: string; snippet?: string; html?: string };
type Post = { id: string; author: string; date: string; html: string };

const DELETE_SCOPE = "dreamviews";
const forumKey = (path: string) => `forum:${path}`;
const threadKey = (path: string) => `thread:${path}`;
const postKey = (path: string, id: string) => `post:${path}:${id}`;

export default function DreamviewsPage() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [forumPath, setForumPath] = useState("/forum.php");
  const [forumTitle, setForumTitle] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadPath, setThreadPath] = useState("");
  const [threadTitle, setThreadTitle] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [manualPath, setManualPath] = useState("/forum.php");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  async function refreshDeleted() {
    try { setDeleted(await loadDeleted(DELETE_SCOPE)); }
    catch (e: any) { setError(e.message || "Could not load database deletes"); }
  }

  async function loadForums() {
    setLoading(true); setError("");
    try {
      await refreshDeleted();
      const res = await fetch("/api/dreamviews/forums", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "DreamViews failed");
      setForums(data.forums || []);
    } catch (e: any) { setError(e.message || "DreamViews failed"); }
    finally { setLoading(false); }
  }

  async function loadForum(path: string) {
    const actual = path || "/forum.php";
    setForumPath(actual); setThreadPath(""); setThreadTitle(""); setPosts([]); setLoading(true); setError("");
    try {
      await refreshDeleted();
      const res = await fetch(`/api/dreamviews/forum?path=${encodeURIComponent(actual)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Forum failed");
      setForumTitle(data.title || actual);
      setThreads(data.threads || []);
    } catch (e: any) { setError(e.message || "Forum failed"); }
    finally { setLoading(false); }
  }

  async function loadThread(path: string) {
    const actual = path || "";
    setThreadPath(actual); setLoading(true); setError("");
    try {
      await refreshDeleted();
      const res = await fetch(`/api/dreamviews/thread?path=${encodeURIComponent(actual)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Thread failed");
      setThreadTitle(data.title || actual);
      setPosts(data.posts || []);
    } catch (e: any) { setError(e.message || "Thread failed"); }
    finally { setLoading(false); }
  }

  async function removeForever(key: string, label: string) {
    setDeleted((old) => new Set([...old, key]));
    try { await deleteForever(DELETE_SCOPE, key, label); }
    catch (e: any) { setError(e.message || "Database delete failed"); await refreshDeleted(); }
  }

  useEffect(() => { loadForums(); }, []);

  const visibleForums = useMemo(() => forums.filter(f => !deleted.has(forumKey(f.path))), [forums, deleted]);
  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads
      .filter(t => !deleted.has(threadKey(t.path)))
      .filter(t => !q || `${t.title} ${t.snippet}`.toLowerCase().includes(q));
  }, [threads, search, deleted]);
  const visiblePosts = useMemo(() => posts.filter(p => !deleted.has(postKey(threadPath, p.id))), [posts, threadPath, deleted]);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>DreamViews viewport</h1>
          <p className="muted">Read-only. Delete writes a permanent tombstone to Neon. No login, no posting, no images.</p>
        </div>
      </div>

      <div className="row panel">
        <button onClick={loadForums} disabled={loading}>reload forums</button>
        <input value={manualPath} onChange={e => setManualPath(e.target.value)} placeholder="/forum.php or DreamViews URL" style={{ minWidth: 340 }} />
        <button onClick={() => loadForum(manualPath || "/forum.php")}>open as forum</button>
        <button onClick={() => loadThread(manualPath)}>open as thread</button>
        <button onClick={refreshDeleted}>reload deletes</button>
        {loading && <span className="muted">loading...</span>}
        {error && <span className="small" style={{ color: "var(--danger)" }}>{error}</span>}
      </div>

      <div className="two">
        <section className="stack">
          <div className="panel"><h2>Forums</h2><p className="muted small">Click a forum, then click a thread.</p></div>
          {visibleForums.map(f => <article className="thread" key={f.path}>
            <div className="spread">
              <button onClick={() => loadForum(f.path)}>{f.title}</button>
              <button className="danger" onClick={() => removeForever(forumKey(f.path), f.title)}>delete forever</button>
            </div>
            <p className="muted small">{f.path} {f.threads && `· threads ${f.threads}`} {f.posts && `· posts ${f.posts}`}</p>
          </article>)}
        </section>

        <section className="stack viewer">
          <div className="panel stack">
            <h2>{forumTitle || "Forum"}</h2>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="filter loaded threads" />
            <p className="muted small">Current forum: {forumPath}</p>
          </div>

          {visibleThreads.map(t => <article className="thread" key={t.path}>
            <div className="spread">
              <button onClick={() => loadThread(t.path)}>{t.title}</button>
              <button className="danger" onClick={() => removeForever(threadKey(t.path), t.title)}>delete forever</button>
            </div>
            <p className="muted small">{t.path}</p>
            <p>{t.snippet}</p>
          </article>)}

          {threadTitle && <div className="panel"><h2>{threadTitle}</h2><p className="muted small">Current thread: {threadPath}</p></div>}
          {visiblePosts.map(p => <article className="post" key={p.id}>
            <div className="spread">
              <div><span className="badge">{p.id}</span> <span className="muted small">{p.author} · {p.date}</span></div>
              <button className="danger" onClick={() => removeForever(postKey(threadPath, p.id), `${threadTitle} ${p.id}`)}>delete forever</button>
            </div>
            <div className="html" dangerouslySetInnerHTML={{ __html: p.html }} />
          </article>)}
        </section>
      </div>
    </div>
  );
}
