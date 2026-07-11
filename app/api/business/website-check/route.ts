import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { normalizePublicHttpUrl, safeFetchText } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const input = String(req.nextUrl.searchParams.get("url") || "").trim();
    if (!input) return jsonError("missing url", 400);
    const url = normalizePublicHttpUrl(input);
    const started = Date.now();
    const result = await safeFetchText(url, {
      timeoutMs: 9000,
      maxBytes: 220_000,
      acceptContentTypes: /text\/html|application\/xhtml\+xml|text\/plain/i,
      headers: { "User-Agent": "PrivateTerminalDashboard/2.0 website-check" },
    });
    const html = result.body;
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "";
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const hasContact = /(contact|yhteys|phone|puhelin|tel:|mailto:|<form\b)/i.test(html);
    const hasModern = /(next-data|__next|react|vue|vite|astro|wp-content|shopify|squarespace|wix|webflow)/i.test(html);
    const hasMetaDescription = /<meta[^>]+name=["']description["']/i.test(html);
    const hasH1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
    const hasHttps = result.url.protocol === "https:";
    const oldMarkup = /<font\b|<center\b|<frameset\b|generator["'][^>]*(frontpage|dreamweaver)/i.test(html);
    const responseMs = Date.now() - started;
    const issues = [
      !hasHttps && "not HTTPS",
      !hasViewport && "mobile viewport missing",
      !hasContact && "no obvious contact path",
      !hasMetaDescription && "meta description missing",
      !hasH1 && "main heading missing",
      oldMarkup && "old HTML signals",
      html.length < 4500 && "very small page",
      responseMs > 3500 && "slow response",
      result.response.status >= 400 && `HTTP ${result.response.status}`,
    ].filter(Boolean);
    const weak = issues.length >= 3 || !hasViewport || !hasContact || result.response.status >= 400;
    return NextResponse.json({
      ok: true,
      url: result.url.toString(),
      status: result.response.status,
      title,
      hasViewport,
      hasContact,
      hasModern,
      hasMetaDescription,
      hasH1,
      hasHttps,
      oldMarkup,
      weak,
      issues,
      bytes: result.bytes,
      truncated: result.truncated,
      responseMs,
    });
  } catch (error: any) {
    return jsonError(error?.name === "AbortError" ? "website check timed out" : error?.message || "Website check failed", authStatus(error));
  }
}
