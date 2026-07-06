"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SUBREDDITS } from "@/lib/redditShared";

type RedditPost = {
  id: string;
  name: string;
  subreddit: string;
  title: string;
  author: string;
  createdUtc: number;
  score: number;
  comments: number;
  domain: string;
  permalink: string;
  url: string;
  selftext: string;
  over18: boolean;
  stickied: boolean;
  isVideo: boolean;
  postHint: string;
};

type RedditComment = {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  depth: number;
  permalink: string;
};

type Block = {
  scope: string;
  target: string;
  expires_at: string | null;
  created_at: string;
};

const SCOPE = "reddit";

function cleanSubreddit(value: string) {
  return value.replace(/[^a-z0-9_]/gi, "").slice(0, 80);
}

function postKey(id: string) {
  return `post:${id}`;
}

function commentKey(id: string) {
  return `comment:${id}`;
}

function timeAgo(seconds: number) {
  if (!seconds) return "unknown";
  const diff = Math.max(1, Math.floor(Date.now() / 1000 - seconds));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function blockText(block: Block) {
  return block.expires_at
    ? `until ${new Date(block.expires_at).toLocaleString()}`
    : "permanent";
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

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export default function RedditClient({ username }: { username: string }) {
  const [subredditInput, setSubredditInput] = useState("all");
  const [activeSubreddit, setActiveSubreddit] = useState("all");
  const [sort, setSort] = useState("hot");
  const [time, setTime] = useState("day");

  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [selected, setSelected] = useState<RedditPost | null>(null);
  const [comments, setComments] = useState<RedditComment[]>([]);
  const [after, setAfter] = useState("");

  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(`ready as ${username}`);
  const [loading, setLoading] = useState(false);

  const viewRef = useRef<HTMLElement | null>(null);

  const blockedSubs = useMemo(() => new Set(blocks.map((block) => block.target.toLowerCase())), [blocks]);
  const activeBlocked = blockedSubs.has(activeSubreddit.toLowerCase());

  async function loadDeleted() {
    const response = await fetch(`/api/deleted?scope=${SCOPE}`, { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error || "hidden reddit items failed");
    const next = new Set<string>(
      Array.isArray(data.keys) ? data.keys.filter((key: unknown) => typeof key === "string") : []
    );
    setDeleted(next);
    return next;
  }

  async function loadBlocks() {
    const response = await fetch("/api/reddit/blocks", { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.error || "subreddit disables failed");
    const next = Array.isArray(data.blocks) ? data.blocks : [];
    setBlocks(next);
    return next as Block[];
  }

  async function syncAll() {
    try {
      const [nextDeleted, nextBlocks] = await Promise.all([loadDeleted(), loadBlocks()]);
      setStatus(`synced · hidden ${nextDeleted.size} · disabled subreddits ${nextBlocks.length}`);
    } catch (error) {
      setStatus(errorMessage(error, "sync failed"));
    }
  }

  async function loadSubreddit(rawSubreddit = subredditInput, pageAfter = "") {
    const subreddit = cleanSubreddit(rawSubreddit || "all");
    if (!subreddit || loading) return;

    setLoading(true);
    setStatus(pageAfter ? `loading more r/${subreddit}...` : `loading r/${subreddit}...`);

    if (!pageAfter) {
      setSelected(null);
      setComments([]);
    }

    try {
      const [, freshBlocks] = await Promise.all([loadDeleted(), loadBlocks()]);
      const disabled = freshBlocks.some((block) => block.target.toLowerCase() === subreddit.toLowerCase());

      if (disabled) {
        setActiveSubreddit(subreddit);
        setSubredditInput(subreddit);
        setPosts([]);
        setAfter("");
        setStatus(`r/${subreddit} is disabled for your account.`);
        return;
      }

      const params = new URLSearchParams({ subreddit, sort, time });
      if (pageAfter) params.set("after", pageAfter);

      const response = await fetch(`/api/reddit/list?${params.toString()}`, { cache: "no-store" });
      const data = await readJson(response);

      if (!response.ok) throw new Error(data.error || "Reddit load failed");
      if (data.blocked) {
        setPosts([]);
        setAfter("");
        setStatus(`r/${subreddit} is disabled for your account.`);
        return;
      }

      const nextPosts: RedditPost[] = Array.isArray(data.posts) ? data.posts : [];

      setActiveSubreddit(subreddit);
      setSubredditInput(subreddit);
      setAfter(data.after || "");
      setPosts((old) => (pageAfter ? [...old, ...nextPosts] : nextPosts));
      setStatus(`${pageAfter ? "added" : "loaded"} ${nextPosts.length} posts from r/${subreddit}`);
    } catch (error) {
      setStatus(errorMessage(error, "Reddit load failed"));
      if (!pageAfter) setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  async function openPost(post: RedditPost) {
    if (deleted.has(postKey(post.id))) {
      setStatus("that post is hidden forever for your account");
      return;
    }

    setSelected(post);
    setComments([]);
    setLoading(true);
    setStatus(`opening ${post.title.slice(0, 80)}...`);

    try {
      await loadDeleted();
      const response = await fetch(
        `/api/reddit/comments?subreddit=${encodeURIComponent(post.subreddit)}&id=${encodeURIComponent(post.id)}`,
        { cache: "no-store" }
      );
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "comments failed");
      setSelected(data.post || post);
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setStatus(`loaded ${data.count || 0} comments`);
      window.setTimeout(() => viewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (error) {
      setStatus(errorMessage(error, "comments failed"));
    } finally {
      setLoading(false);
    }
  }

  async function hideForever(key: string, label: string) {
    setDeleted((old) => {
      const next = new Set(old);
      next.add(key);
      return next;
    });

    if (selected && key === postKey(selected.id)) {
      setSelected(null);
      setComments([]);
    }

    try {
      const response = await fetch("/api/deleted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: SCOPE, key, label }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "hide failed");
      setStatus(`hidden forever: ${label}`);
    } catch (error) {
      setStatus(errorMessage(error, "hide failed"));
      await loadDeleted();
    }
  }

  async function disableSubreddit(mode: "1" | "7" | "30" | "permanent") {
    const subreddit = cleanSubreddit(subredditInput || activeSubreddit).toLowerCase();
    if (!subreddit) return;

    setLoading(true);
    setStatus(`disabling r/${subreddit}...`);

    try {
      const response = await fetch("/api/reddit/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subreddit, mode }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "disable failed");
      setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
      if (activeSubreddit.toLowerCase() === subreddit) {
        setPosts([]);
        setSelected(null);
        setComments([]);
        setAfter("");
      }
      setStatus(`r/${subreddit} disabled ${mode === "permanent" ? "permanently" : `for ${mode} day${mode === "1" ? "" : "s"}`}`);
    } catch (error) {
      setStatus(errorMessage(error, "disable failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void syncAll().then(() => loadSubreddit("all"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts
      .filter((post) => !deleted.has(postKey(post.id)))
      .filter((post) => {
        if (!q) return true;
        return `${post.title} ${post.author} ${post.domain} ${post.selftext}`.toLowerCase().includes(q);
      });
  }, [posts, deleted, search]);

  const visibleComments = useMemo(() => {
    return comments.filter((comment) => !deleted.has(commentKey(comment.id)));
  }, [comments, deleted]);

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">r/{activeSubreddit}</p>
            <h1 className="terminal-title">Reddit viewport</h1>
            <p className="muted">
              Read-only Reddit. No posting, no commenting. Per-user hidden posts/comments and subreddit disables.
            </p>
          </div>
          <div className="row">
            <button onClick={() => loadSubreddit(activeSubreddit)} disabled={loading || activeBlocked}>
              reload
            </button>
            <button onClick={syncAll} disabled={loading}>
              sync
            </button>
          </div>
        </div>

        <div className="row">
          <input
            value={subredditInput}
            onChange={(event) => setSubredditInput(cleanSubreddit(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") void loadSubreddit(subredditInput);
            }}
            placeholder="subreddit e.g. AskReddit"
          />

          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="hot">hot</option>
            <option value="new">new</option>
            <option value="top">top</option>
            <option value="rising">rising</option>
          </select>

          {sort === "top" && (
            <select value={time} onChange={(event) => setTime(event.target.value)}>
              <option value="hour">hour</option>
              <option value="day">day</option>
              <option value="week">week</option>
              <option value="month">month</option>
              <option value="year">year</option>
              <option value="all">all</option>
            </select>
          )}

          <button onClick={() => loadSubreddit(subredditInput)} disabled={loading}>
            load subreddit
          </button>

          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="filter loaded posts" />
        </div>

        <details className="panel stack">
          <summary>subreddit starter list</summary>
          <div className="subreddit-grid">
            {DEFAULT_SUBREDDITS.map((subreddit) => (
              <button
                className="subreddit-chip"
                key={subreddit}
                onClick={() => loadSubreddit(subreddit)}
                disabled={loading || blockedSubs.has(subreddit.toLowerCase())}
              >
                r/{subreddit}
              </button>
            ))}
          </div>
        </details>

        <div className="row">
          <button className="warn" onClick={() => disableSubreddit("1")} disabled={loading}>
            disable 1 day
          </button>
          <button className="warn" onClick={() => disableSubreddit("7")} disabled={loading}>
            disable 7 days
          </button>
          <button className="warn" onClick={() => disableSubreddit("30")} disabled={loading}>
            disable 30 days
          </button>
          <button className="danger" onClick={() => disableSubreddit("permanent")} disabled={loading}>
            disable forever
          </button>
        </div>

        <p className="muted small">
          Status: {loading ? "loading... " : ""}
          {status}
        </p>
      </section>

      {blocks.length > 0 && (
        <section className="panel stack">
          <h2>Disabled subreddits</h2>
          <div className="row">
            {blocks.map((block) => (
              <span className="badge warn" key={block.target}>
                r/{block.target} {blockText(block)}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="reddit-layout">
        <section className="stack reddit-view" ref={viewRef}>
          <div className="panel stack">
            <div>
              <h2>{selected ? selected.title : "Open a Reddit post"}</h2>
              <p className="muted small">
                {selected
                  ? `showing ${visibleComments.length}/${comments.length} loaded comments after your hides`
                  : "On mobile, opened comments appear here above the post list."}
              </p>
            </div>

            {selected && (
              <div className="row">
                <a className="buttonlike" href={`https://www.reddit.com${selected.permalink}`} target="_blank" rel="noreferrer">
                  open on Reddit
                </a>
                <button className="danger" onClick={() => hideForever(postKey(selected.id), selected.title)}>
                  hide post forever
                </button>
              </div>
            )}
          </div>

          {selected && (
            <article className="post stack">
              <div className="spread">
                <div>
                  <span className="badge">r/{selected.subreddit}</span>{" "}
                  <span className="muted small">
                    u/{selected.author} · {timeAgo(selected.createdUtc)} · score {selected.score} · comments {selected.comments}
                  </span>
                </div>
                {selected.over18 && <span className="badge danger">nsfw</span>}
              </div>
              {selected.selftext && <pre>{selected.selftext}</pre>}
              {selected.url && selected.url !== `https://www.reddit.com${selected.permalink}` && (
                <a className="buttonlike" href={selected.url} target="_blank" rel="noreferrer">
                  open linked URL
                </a>
              )}
            </article>
          )}

          {selected && visibleComments.length === 0 && !loading && (
            <div className="panel">
              <p className="muted">No comments shown. They may be hidden or Reddit returned no readable comments.</p>
            </div>
          )}

          {visibleComments.map((comment) => (
            <article className="post stack" key={comment.id} style={{ marginLeft: Math.min(comment.depth, 5) * 12 }}>
              <div className="spread">
                <div>
                  <span className="badge">u/{comment.author}</span>{" "}
                  <span className="muted small">
                    {timeAgo(comment.createdUtc)} · score {comment.score}
                  </span>
                </div>
                <button className="danger" onClick={() => hideForever(commentKey(comment.id), `comment ${comment.id}`)}>
                  hide comment
                </button>
              </div>
              <pre>{comment.body}</pre>
            </article>
          ))}
        </section>

        <section className="stack reddit-list">
          <div className="panel spread">
            <div>
              <h2>Posts</h2>
              <p className="muted small">
                showing {visiblePosts.length}/{posts.length}
              </p>
            </div>
            {after && (
              <button onClick={() => loadSubreddit(activeSubreddit, after)} disabled={loading}>
                more posts
              </button>
            )}
          </div>

          {visiblePosts.length === 0 && !loading && (
            <div className="panel">
              <p className="muted">No visible posts. Load a subreddit, clear filter, or check disabled subreddits.</p>
            </div>
          )}

          {visiblePosts.map((post) => (
            <article className="thread stack" key={post.id}>
              <div className="spread">
                <div>
                  <h3>{post.title || "(no title)"}</h3>
                  <p className="muted small">
                    r/{post.subreddit} · u/{post.author} · {timeAgo(post.createdUtc)} · score {post.score} · comments {post.comments} · {post.domain}
                  </p>
                </div>
                <div className="row">
                  {post.stickied && <span className="badge warn">sticky</span>}
                  {post.over18 && <span className="badge danger">nsfw</span>}
                </div>
              </div>

              {post.selftext && <p>{post.selftext.slice(0, 500)}</p>}

              <div className="row">
                <button onClick={() => openPost(post)} disabled={loading}>
                  open comments
                </button>
                <button className="danger" onClick={() => hideForever(postKey(post.id), post.title)}>
                  hide forever
                </button>
                <a className="buttonlike" href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer">
                  reddit tab
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
