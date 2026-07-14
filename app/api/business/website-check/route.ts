import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { normalizePublicHttpUrl, safeFetchText } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function textTitle(html: string) {
  return (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const input = String(req.nextUrl.searchParams.get("url") || "").trim();
    if (!input) return jsonError("missing url", 400);
    const url = normalizePublicHttpUrl(input);
    const started = Date.now();
    const result = await safeFetchText(url, {
      timeoutMs: 8000,
      maxBytes: 260_000,
      acceptContentTypes: /text\/html|application\/xhtml\+xml|text\/plain/i,
      headers: { "User-Agent": "RaccoonNorthWebsiteReview/3.0 (+manual business website assessment)" },
    });
    const html = result.body;
    const status = result.response.status;
    const title = textTitle(html);
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const hasContact = /(contact|yhteys|yhteystiedot|phone|puhelin|tel:|mailto:|<form\b)/i.test(html);
    const hasModern = /(next-data|__next|react|vue|vite|astro|wp-content|shopify|squarespace|wix|webflow)/i.test(html);
    const hasMetaDescription = /<meta[^>]+name=["']description["']/i.test(html);
    const hasH1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
    const hasHttps = result.url.protocol === "https:";
    const oldMarkup = /<font\b|<center\b|<frameset\b|generator["'][^>]*(frontpage|dreamweaver)/i.test(html);
    const responseMs = Date.now() - started;

    const technicalIssues = [
      !hasHttps && "HTTPS is not enabled",
      !hasViewport && "mobile viewport is missing",
      oldMarkup && "old HTML/layout signals were detected",
      !title && "page title was not found",
      !hasH1 && "main heading was not found",
      status >= 400 && `homepage returned HTTP ${status}`,
      responseMs > 5000 && "server response was slow during this check",
    ].filter((value): value is string => Boolean(value));
    const improvementNotes = [
      !hasMetaDescription && "meta description was not found",
      !hasContact && "the scanner did not confirm a direct contact path on the homepage",
      html.length > 0 && html.length < 3000 && "homepage returned very little HTML; it may be JavaScript-rendered",
    ].filter((value): value is string => Boolean(value));

    const inaccessible = status === 0 || status >= 500 || !html;
    const serious = !hasHttps || !hasViewport || oldMarkup || status >= 400;
    const classification = inaccessible
      ? "manual_review"
      : serious && technicalIssues.length >= 2
        ? "upgrade_opportunity"
        : technicalIssues.length + improvementNotes.length >= 3
          ? "needs_review"
          : "basic_checks_ok";
    const weak = classification === "upgrade_opportunity";
    const confidence = inaccessible || result.truncated ? "low" : "medium";

    return NextResponse.json({
      ok: true,
      url: result.url.toString(),
      status,
      title,
      hasViewport,
      hasContact,
      hasModern,
      hasMetaDescription,
      hasH1,
      hasHttps,
      oldMarkup,
      weak,
      classification,
      confidence,
      issues: technicalIssues,
      improvementNotes,
      summary: classification === "basic_checks_ok"
        ? "The fetched homepage passed the basic technical check. This does not measure design quality or business results."
        : classification === "upgrade_opportunity"
          ? "The fetched homepage has concrete technical issues worth verifying manually before outreach."
          : "The automated check is not strong enough for a sales claim. Review the live website manually.",
      bytes: result.bytes,
      truncated: result.truncated,
      responseMs,
    });
  } catch (error: any) {
    const message = error?.name === "AbortError" ? "website check timed out; review the site manually" : error?.message || "Website check failed";
    return jsonError(message, authStatus(error));
  }
}
