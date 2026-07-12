import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { runBusinessAction } from "@/lib/businessSuite";
import { normalizePublicHttpUrl, safeFetchText } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Issue = { severity: "high" | "medium" | "low"; label: string; detail?: string };

function cleanText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function internalLinks(html: string, base: URL) {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], base);
      if (["http:", "https:"].includes(url.protocol) && url.hostname === base.hostname) {
        url.hash = "";
        links.add(url.toString());
      }
    } catch {}
    if (links.size >= 15) break;
  }
  return Array.from(links);
}

function scoreFromIssues(issues: Issue[]) {
  const penalty = issues.reduce((sum, issue) => sum + (issue.severity === "high" ? 12 : issue.severity === "medium" ? 6 : 2), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

async function pageSpeed(url: string, strategy: string) {
  const params = new URLSearchParams({ url, strategy, locale: "en" });
  for (const category of ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"]) params.append("category", category);
  const key = process.env.PAGESPEED_API_KEY || "";
  if (key) params.set("key", key);
  const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(data?.error?.message || `PageSpeed failed (${response.status})`);
  const categories = data?.lighthouseResult?.categories || {};
  const audits = data?.lighthouseResult?.audits || {};
  const pct = (value: unknown) => typeof value === "number" ? Math.round(value * 100) : null;
  const issues: Issue[] = [];
  for (const audit of Object.values(audits) as any[]) {
    if (typeof audit?.score !== "number" || audit.score >= 0.9 || audit.scoreDisplayMode === "notApplicable") continue;
    const severity: Issue["severity"] = audit.score < 0.5 ? "high" : audit.score < 0.75 ? "medium" : "low";
    issues.push({ severity, label: String(audit.title || audit.id || "Lighthouse issue"), detail: String(audit.displayValue || audit.description || "").replace(/\[[^\]]+\]\([^\)]+\)/g, "").slice(0, 400) });
  }
  const screenshotData = audits?.["final-screenshot"]?.details?.data;
  return {
    performance: pct(categories.performance?.score),
    accessibility: pct(categories.accessibility?.score),
    seo: pct(categories.seo?.score),
    bestPractices: pct(categories["best-practices"]?.score),
    issues: issues.slice(0, 30),
    screenshot: typeof screenshotData === "string" && screenshotData.length < 300_000 ? screenshotData : "",
  };
}

async function browserlessScreenshot(url: string) {
  const token = process.env.BROWSERLESS_TOKEN || "";
  if (!token) return "";
  const base = (process.env.BROWSERLESS_BASE_URL || "https://production-sfo.browserless.io").replace(/\/$/, "");
  const response = await fetch(`${base}/screenshot?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, gotoOptions: { waitUntil: "networkidle2", timeout: 20_000 }, options: { type: "jpeg", quality: 55, fullPage: false } }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return "";
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > 300_000) return "";
  return `data:image/jpeg;base64,${data.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const leadId = String(body.leadId || "").slice(0, 300);
    const strategy = String(body.strategy || "mobile") === "desktop" ? "desktop" : "mobile";
    const start = normalizePublicHttpUrl(String(body.url || ""));
    const result = await safeFetchText(start, { timeoutMs: 12_000, maxBytes: 850_000, acceptContentTypes: /html|text/i });
    const html = result.body;
    if (!html) throw new Error(`Website returned no readable HTML (${result.response.status})`);
    const issues: Issue[] = [];
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() || "";
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] || "";
    const text = cleanText(html);
    const facts: Record<string, unknown> = {
      status: result.response.status,
      finalUrl: result.url.toString(),
      responseMs: null,
      bytes: result.bytes,
      title,
      description,
      wordCount: text ? text.split(/\s+/).length : 0,
      hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
      hasH1: /<h1\b/i.test(html),
      hasHttps: result.url.protocol === "https:",
      hasContactForm: /<form\b/i.test(html) && /email|phone|message|viesti|yhteys|contact/i.test(html),
      hasPhoneLink: /href=["']tel:/i.test(html),
      hasEmailLink: /href=["']mailto:/i.test(html),
      hasPrivacy: /privacy|tietosuoja|rekisteriseloste/i.test(html),
      hasCookieText: /cookie|eväste/i.test(html),
      hasStructuredData: /application\/ld\+json/i.test(html),
      hasOpenGraph: /property=["']og:/i.test(html),
      hasCanonical: /rel=["']canonical/i.test(html),
      language: html.match(/<html[^>]+lang=["']([^"']+)/i)?.[1] || "",
    };
    if (result.response.status >= 400) issues.push({ severity: "high", label: `Homepage returned HTTP ${result.response.status}` });
    if (result.url.protocol !== "https:") issues.push({ severity: "high", label: "Website does not use HTTPS" });
    if (!facts.hasViewport) issues.push({ severity: "high", label: "Mobile viewport is missing" });
    if (!title || title.length < 10) issues.push({ severity: "medium", label: "Page title is missing or too short" });
    if (!description || description.length < 50) issues.push({ severity: "medium", label: "Meta description is missing or too short" });
    if (!facts.hasH1) issues.push({ severity: "medium", label: "Main H1 heading is missing" });
    if (!facts.hasContactForm && !facts.hasPhoneLink && !facts.hasEmailLink) issues.push({ severity: "high", label: "No obvious contact action was found" });
    if (!facts.hasPrivacy) issues.push({ severity: "medium", label: "No privacy page link was detected" });
    if (!facts.hasStructuredData) issues.push({ severity: "low", label: "No JSON-LD structured data was detected" });
    if (!facts.hasOpenGraph) issues.push({ severity: "low", label: "Social sharing metadata is missing" });
    if (!facts.hasCanonical) issues.push({ severity: "low", label: "Canonical URL tag is missing" });

    const links = internalLinks(html, result.url);
    const checked = await Promise.all(links.slice(0, 10).map(async (url) => {
      try {
        const page = await safeFetchText(url, { timeoutMs: 6000, maxBytes: 16_000, maxRedirects: 3 });
        return { url, status: page.response.status };
      } catch { return { url, status: 0 }; }
    }));
    const broken = checked.filter((item) => item.status === 0 || item.status >= 400);
    facts.checkedInternalLinks = checked.length;
    facts.brokenInternalLinks = broken;
    if (broken.length) issues.push({ severity: broken.length >= 3 ? "high" : "medium", label: `${broken.length} broken internal link${broken.length === 1 ? "" : "s"} found`, detail: broken.map((item) => item.url).join(", ").slice(0, 500) });

    let psi: Awaited<ReturnType<typeof pageSpeed>> | null = null;
    let pageSpeedError = "";
    try { psi = await pageSpeed(result.url.toString(), strategy); } catch (error) { pageSpeedError = error instanceof Error ? error.message : "PageSpeed failed"; }
    if (psi) issues.push(...psi.issues);
    facts.pageSpeedError = pageSpeedError;
    const lighthouseValues = [psi?.performance, psi?.accessibility, psi?.seo, psi?.bestPractices].filter((value): value is number => typeof value === "number");
    const quality = lighthouseValues.length ? Math.round(lighthouseValues.reduce((a, b) => a + b, 0) / lighthouseValues.length) : scoreFromIssues(issues);
    const screenshot = psi?.screenshot || await browserlessScreenshot(result.url.toString()).catch(() => "");
    const payload = {
      leadId,
      url: result.url.toString(),
      strategy,
      score: quality,
      performance: psi?.performance ?? null,
      accessibility: psi?.accessibility ?? null,
      seo: psi?.seo ?? null,
      bestPractices: psi?.bestPractices ?? null,
      issues: issues.slice(0, 80),
      facts,
      screenshot,
    };
    await runBusinessAction("audit.save", payload);
    return NextResponse.json({ ok: true, audit: payload });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Website audit failed" }, { status: authStatus(error) });
  }
}
