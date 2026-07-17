import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { cleanRedditId, cleanSubreddit, redditConfigured, redditFetch } from "@/lib/reddit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown, max = 10000) { return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : ""; }
function number(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error, configured: redditConfigured() }, { status }); }

type Comment = { id: string; author: string; body: string; score: number; createdUtc: number; depth: number; permalink: string; replies: Comment[] };

function mapComments(children: any[], depth = 0, counter = { value: 0 }): Comment[] {
  if (!Array.isArray(children) || depth > 12 || counter.value >= 400) return [];
  const result: Comment[] = [];
  for (const child of children) {
    if (counter.value >= 400 || child?.kind !== "t1") continue;
    const c = child?.data || {};
    const id = text(c.id, 30);
    if (!id) continue;
    counter.value += 1;
    const replyChildren = c.replies?.data?.children;
    result.push({
      id,
      author: text(c.author, 80),
      body: text(c.body, 16000),
      score: number(c.score),
      createdUtc: number(c.created_utc),
      depth,
      permalink: text(c.permalink, 1000),
      replies: mapComments(Array.isArray(replyChildren) ? replyChildren : [], depth + 1, counter),
    });
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const subreddit = cleanSubreddit(req.nextUrl.searchParams.get("subreddit") || "all");
    const id = cleanRedditId(req.nextUrl.searchParams.get("id") || "");
    if (!id) return jsonError("Missing post", 400);
    const { body, rate } = await redditFetch(`/r/${subreddit}/comments/${id}`, { raw_json: 1, limit: 300, depth: 12, sort: "best" });
    if (!Array.isArray(body) || body.length < 2) return jsonError("Reddit returned an invalid thread", 502);
    const postData = body[0]?.data?.children?.[0]?.data || {};
    const post = {
      id: text(postData.id, 30),
      subreddit: text(postData.subreddit, 40),
      title: text(postData.title, 600),
      author: text(postData.author, 80),
      score: number(postData.score),
      comments: number(postData.num_comments),
      createdUtc: number(postData.created_utc),
      selftext: text(postData.selftext, 20000),
      url: text(postData.url_overridden_by_dest || postData.url, 1600),
      permalink: text(postData.permalink, 1000),
      domain: text(postData.domain, 160),
      isSelf: Boolean(postData.is_self),
    };
    const comments = mapComments(body[1]?.data?.children || []);
    return NextResponse.json({ ok: true, configured: true, post, comments, rate });
  } catch (error: any) {
    return jsonError(error?.name === "AbortError" ? "Reddit timed out" : error?.message || "Reddit thread failed", authStatus(error));
  }
}
