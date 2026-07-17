"use client";

import { useEffect, useMemo, useState } from "react";
import { CompactStatus, IconAction, IconLink } from "./IconAction";

type RedditPost = {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  comments: number;
  createdUtc: number;
  selftext: string;
  url: string;
  permalink: string;
  domain: string;
  isSelf: boolean;
  over18?: boolean;
  spoiler?: boolean;
  stickied?: boolean;
  locked?: boolean;
};

type RedditComment = {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  depth: number;
  permalink: string;
  replies: RedditComment[];
};

type ListingResult = {
  ok?: boolean;
  configured?: boolean;
  posts?: RedditPost[];
  after?: string;
  error?: string;
};

type ThreadResult = {
  ok?: boolean;
  configured?: boolean;
  post?: RedditPost;
  comments?: RedditComment[];
  error?: string;
};

const SCOPE = "reddit";
const SUB_STORAGE = "raccoon-personal-reddit-subs-v1";
const SORTS = [
  ["hot", "♨", "Hot"],
  ["new", "+", "New"],
  ["top", "↑", "Top"],
  ["rising", "↗", "Rising"],
] as const;

function postKey(id: string) { return `post:${id}`; }
function commentKey(id: string) { return `comment:${id}`; }
function cleanSub(value: string) { return value.replace(/^r\//i, "").replace(/[^a-z0-9_]/gi, "").slice(0, 32).toLowerCase() || "all"; }
function readJson(response: Response) { return response.text().then((text) => { try { return text ? JSON.parse(text) : {}; } catch { return { error: text }; } }); }
function when(value: number) { return value ? new Date(value * 1000).toLocaleString() : ""; }
function redditUrl(path: string) { return path ? `https://www.reddit.com${path}` : "https://www.reddit.com"; }
function loadSubs() {
  try {
    const value = JSON.parse(localStorage.getItem(SUB_STORAGE) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").map(cleanSub).slice(0, 50) : [];
  } catch { return []; }
}

function flattenComments(comments: RedditComment[], hidden: Set<string>, output: RedditComment[] = []) {
  for (const comment of comments) {
    if (!hidden.has(commentKey(comment.id))) output.push(comment);
    flattenComments(comment.replies || [], hidden, output);
  }
  return output;
}

export default function RedditTerminalClient() {
  const [subreddit, setSubreddit] = useState("all");
  const [subInput, setSubInput] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("hot");
  const [time, setTime] = useState("day");
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [selected, setSelected] = useState<RedditPost | null>(null);
  const [comments, setComments] = useState<RedditComment[]>([]);
  const [after, setAfter] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [savedSubs, setSavedSubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("·");
  const [help, setHelp] = useState(false);

  useEffect(() => {
    setSavedSubs(loadSubs());
    void loadHidden();
  }, []);

  async function loadHidden() {
    const response = await fetch(`/api/deleted?scope=${SCOPE}`, { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error || "sync failed");
    const next = new Set<string>(Array.isArray(data.keys) ? data.keys.filter((key: unknown) => typeof key === "string") : []);
    setHidden(next);
    return next;
  }

  function persistSubs(next: string[]) {
    const clean = [...new Set(next.map(cleanSub))].slice(0, 50);
    setSavedSubs(clean);
    localStorage.setItem(SUB_STORAGE, JSON.stringify(clean));
  }

  async function hideForever(key: string) {
    setHidden((old) => new Set(old).add(key));
    if (selected && key === postKey(selected.id)) { setSelected(null); setComments([]); }
    const response = await fetch("/api/deleted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: SCOPE, key, label: key }),
    });
    const data = await readJson(response);
    if (!response.ok) { await loadHidden(); throw new Error(data.error || "hide failed"); }
    setStatus("×");
  }

  async function loadListing(nextAfter = "", selectedSort = sort, overrideSub = "") {
    if (loading) return;
    const sub = cleanSub(overrideSub || subInput || subreddit);
    setLoading(true);
    setStatus("…");
    try {
      const currentHidden = await loadHidden();
      const params = new URLSearchParams({ subreddit: sub, sort: selectedSort, time, after: nextAfter });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/reddit/list?${params}`, { cache: "no-store" });
      const data = await readJson(response) as ListingResult;
      if (!response.ok || !data.ok) throw new Error(data.error || "Reddit failed");
      const incoming = (data.posts || []).filter((post) => !currentHidden.has(postKey(post.id)));
      setPosts((old) => nextAfter ? [...old, ...incoming] : incoming);
      setAfter(data.after || "");
      setSubreddit(sub);
      setSubInput(sub);
      setSelected(null);
      setComments([]);
      setStatus(`${incoming.length}${data.after ? "+" : ""}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "error");
    } finally { setLoading(false); }
  }

  async function openThread(post: RedditPost) {
    if (loading) return;
    setLoading(true);
    setSelected(post);
    setComments([]);
    setStatus("…");
    try {
      const currentHidden = await loadHidden();
      if (currentHidden.has(postKey(post.id))) { setSelected(null); return; }
      const params = new URLSearchParams({ subreddit: post.subreddit || subreddit, id: post.id });
      const response = await fetch(`/api/reddit/thread?${params}`, { cache: "no-store" });
      const data = await readJson(response) as ThreadResult;
      if (!response.ok || !data.ok || !data.post) throw new Error(data.error || "thread failed");
      setSelected(data.post);
      setComments(data.comments || []);
      setStatus(String(flattenComments(data.comments || [], currentHidden).length));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "error");
    } finally { setLoading(false); }
  }

  const visiblePosts = useMemo(() => posts.filter((post) => !hidden.has(postKey(post.id))), [posts, hidden]);
  const visibleComments = useMemo(() => flattenComments(comments, hidden, []), [comments, hidden]);

  return (
    <div className="personal-tool personal-reddit stack">
      <section className="panel personal-toolbar stack">
        <div className="row personal-icon-row">
          <input
            className="personal-short-input"
            value={subInput}
            onChange={(event) => setSubInput(cleanSub(event.target.value))}
            onKeyDown={(event) => { if (event.key === "Enter") void loadListing(); }}
            aria-label="Subreddit"
            placeholder="r/"
          />
          <IconAction label="Open subreddit" onClick={() => void loadListing()} disabled={loading}>→</IconAction>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void loadListing(); }}
            aria-label="Search this subreddit"
            placeholder="⌕"
          />
          <IconAction label="Search or refresh" onClick={() => void loadListing()} disabled={loading}>↻</IconAction>
          <IconAction label="Synchronize permanently hidden items" onClick={() => void loadHidden().then((items) => setStatus(String(items.size))).catch((error) => setStatus(error.message))} disabled={loading}>⟳</IconAction>
          <IconAction label="Show symbol help" onClick={() => setHelp((value) => !value)}>?</IconAction>
        </div>
        <div className="row personal-icon-row">
          {SORTS.map(([value, icon, label]) => (
            <IconAction key={value} label={label} className={sort === value ? "active" : ""} onClick={() => { setSort(value); void loadListing("", value); }} disabled={loading}>{icon}</IconAction>
          ))}
          <select value={time} onChange={(event) => setTime(event.target.value)} aria-label="Time range" title="Time range">
            <option value="hour">1h</option><option value="day">1d</option><option value="week">1w</option><option value="month">1m</option><option value="year">1y</option><option value="all">∞</option>
          </select>
          <IconAction label="Save current subreddit" onClick={() => persistSubs([subreddit, ...savedSubs])}>☆</IconAction>
          {after && <IconAction label="Load more posts" onClick={() => void loadListing(after)} disabled={loading}>+</IconAction>}
          <CompactStatus busy={loading}>{status}</CompactStatus>
        </div>
        {savedSubs.length > 0 && <div className="personal-chip-row">{savedSubs.map((sub) => <button key={sub} className="board-chip" title={`Open r/${sub}`} onClick={() => { setSubInput(sub); setSubreddit(sub); void loadListing("", sort, sub); }}>r/{sub}</button>)}</div>}
        {help && <div className="personal-legend" role="note">→ open · ↻ load · ⟳ sync · ♨ hot · + new/more · ↑ top · ↗ rising/link · ▶ thread · × hide forever · ☆ save</div>}
      </section>

      {selected && (
        <section className="panel stack reddit-thread-view">
          <div className="spread">
            <div className="reddit-meta"><span>r/{selected.subreddit}</span><span>↑{selected.score}</span><span>#{selected.comments}</span><span>{selected.author}</span></div>
            <div className="row">
              <IconAction label="Close thread" onClick={() => { setSelected(null); setComments([]); }}>□</IconAction>
              <IconLink label="Open on Reddit" href={redditUrl(selected.permalink)} target="_blank" rel="noreferrer">↗</IconLink>
              <IconAction className="danger" label="Hide this post forever" onClick={() => void hideForever(postKey(selected.id)).catch((error) => setStatus(error.message))}>×</IconAction>
            </div>
          </div>
          <h2>{selected.title}</h2>
          {selected.selftext && <pre className="reddit-body">{selected.selftext}</pre>}
          {!selected.isSelf && selected.url && <IconLink label="Open linked page" href={selected.url} target="_blank" rel="noreferrer">↗</IconLink>}
          <div className="reddit-comments stack">
            {visibleComments.map((comment) => (
              <article className="reddit-comment" key={comment.id} style={{ marginLeft: `${Math.min(comment.depth, 8) * 14}px` }}>
                <div className="spread">
                  <div className="reddit-meta"><span>{comment.author || "[deleted]"}</span><span>↑{comment.score}</span><span>{when(comment.createdUtc)}</span></div>
                  <div className="row">
                    <IconLink label="Open comment on Reddit" href={redditUrl(comment.permalink)} target="_blank" rel="noreferrer">↗</IconLink>
                    <IconAction className="danger" label="Hide this comment forever" onClick={() => void hideForever(commentKey(comment.id)).catch((error) => setStatus(error.message))}>×</IconAction>
                  </div>
                </div>
                <pre className="reddit-body">{comment.body}</pre>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="stack reddit-list">
        {visiblePosts.map((post) => (
          <article className="post reddit-post" key={post.id}>
            <div className="spread">
              <div className="reddit-meta"><span>r/{post.subreddit}</span><span>↑{post.score}</span><span>#{post.comments}</span>{post.over18 && <span>18+</span>}{post.stickied && <span>◆</span>}</div>
              <div className="row">
                <IconAction label="Open post and comments" onClick={() => void openThread(post)} disabled={loading}>▶</IconAction>
                <IconLink label="Open on Reddit" href={redditUrl(post.permalink)} target="_blank" rel="noreferrer">↗</IconLink>
                <IconAction className="danger" label="Hide this post forever" onClick={() => void hideForever(postKey(post.id)).catch((error) => setStatus(error.message))}>×</IconAction>
              </div>
            </div>
            <h3>{post.title}</h3>
            {post.selftext && <p className="reddit-preview">{post.selftext.slice(0, 700)}</p>}
          </article>
        ))}
        {!loading && visiblePosts.length === 0 && <div className="personal-empty" aria-label="No posts">·</div>}
      </section>
    </div>
  );
}
