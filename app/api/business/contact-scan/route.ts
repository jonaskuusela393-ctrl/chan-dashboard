import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PageScan = {
  url: string;
  status: number;
  title: string;
  bytes: number;
  hasViewport: boolean;
  hasContactWords: boolean;
  hasForm: boolean;
  hasOldMarkup: boolean;
};

const CONTACT_WORDS = /contact|contacts|yhteys|yhteystiedot|ota-yhteytta|ota-yhteyttä|about|meista|meistä|tiimi|team|varaus|booking|quote|tarjous|lomake|message|viesti/i;
const EMAIL_RE = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
const BAD_EMAIL_PARTS = [
  "example.com", "example.fi", "sentry.io", "wixpress.com", "schema.org", "domain.com", "yourdomain",
  "email.com", "test.com", "placeholder", "cloudflare", "wordpress.org", "google.com", "gmail.con",
];

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function uniq(values: string[], max = 12) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function decodeLite(value: string) {
  return value
    .replace(/&#64;|&commat;/gi, "@")
    .replace(/&#46;|&period;/gi, ".")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("only http/https URLs allowed");
  url.hash = "";
  return url;
}

function isUnsafeHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === "0.0.0.0" ||
    host === "::1"
  );
}

function absolute(base: URL, href: string) {
  try {
    const url = new URL(decodeLite(href), base);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function extractTitle(html: string) {
  return decodeLite(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function extractHrefs(html: string) {
  return Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)).map((m) => decodeLite(m[1] || ""));
}

function extractFormActions(html: string, pageUrl: URL) {
  const forms = Array.from(html.matchAll(/<form\b[\s\S]*?<\/form>/gi)).map((m) => m[0]);
  const urls: string[] = [];
  for (const form of forms) {
    const action = form.match(/\saction=["']([^"']+)["']/i)?.[1] || "";
    const target = action ? absolute(pageUrl, action) : pageUrl;
    if (target && ["http:", "https:"].includes(target.protocol)) urls.push(target.toString());
  }
  return urls;
}

function findEmails(html: string) {
  const raw = decodeLite(html);
  const deobfuscated = raw
    .replace(/\s+\[?at\]?\s+/gi, "@")
    .replace(/\s+\(?at\)?\s+/gi, "@")
    .replace(/\s+\[?dot\]?\s+/gi, ".")
    .replace(/\s+\(?dot\)?\s+/gi, ".");
  const matches = [...(raw.match(EMAIL_RE) || []), ...(deobfuscated.match(EMAIL_RE) || [])];
  return uniq(matches.map((email) => email.replace(/^mailto:/i, "").replace(/[),.;:]+$/g, "").toLowerCase()).filter((email) => {
    if (!email.includes(".")) return false;
    if (BAD_EMAIL_PARTS.some((bad) => email.includes(bad))) return false;
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(email)) return false;
    return true;
  }), 8);
}

async function fetchHtml(url: URL) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "private-terminal-dashboard-contact-scan/1.0 (+local business audit)",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.2",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const html = (await response.text()).slice(0, 180000);
    if (contentType && !/text\/html|application\/xhtml\+xml|text\//i.test(contentType)) {
      return { response, html: "" };
    }
    return { response, html };
  } finally {
    clearTimeout(timer);
  }
}

function socialLinks(urls: string[]) {
  const clean = urls.map((href) => href.split("?")[0].replace(/\/$/, ""));
  return {
    facebookUrl: clean.find((href) => /https?:\/\/(www\.)?facebook\.com\//i.test(href) && !/\/sharer|\/plugins/i.test(href)) || "",
    instagramUrl: clean.find((href) => /https?:\/\/(www\.)?instagram\.com\//i.test(href)) || "",
    linkedinUrl: clean.find((href) => /https?:\/\/(www\.)?linkedin\.com\//i.test(href)) || "",
  };
}

function qualityFromPages(root: URL, pages: PageScan[], emails: string[], forms: string[], telLinks: string[]) {
  const first = pages[0];
  let upgradeScore = 25;
  const notes: string[] = [];

  if (root.protocol !== "https:") { upgradeScore += 8; notes.push("not HTTPS"); }
  if (!first?.title) { upgradeScore += 7; notes.push("missing/weak title"); }
  if (pages.some((p) => !p.hasViewport)) { upgradeScore += 28; notes.push("mobile viewport missing on at least one page"); }
  if (!emails.length && !forms.length && !telLinks.length) { upgradeScore += 20; notes.push("no email/form/tel link found"); }
  if (!pages.some((p) => p.hasContactWords)) { upgradeScore += 10; notes.push("contact wording hard to find"); }
  if (first && first.bytes > 0 && first.bytes < 5500) { upgradeScore += 12; notes.push("very small/simple homepage"); }
  if (pages.some((p) => p.hasOldMarkup)) { upgradeScore += 14; notes.push("old HTML/layout signals"); }
  if (pages.some((p) => p.status >= 400)) { upgradeScore += 8; notes.push("some contact pages returned errors"); }

  const score = Math.max(0, Math.min(100, upgradeScore));
  const siteQuality = score >= 62 ? "weak" : score >= 42 ? "needs_review" : "ok";
  return { upgradeScore: score, siteQuality, siteNotes: notes.length ? notes.join(" · ") : "Basic signals look okay; still check design manually." };
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const raw = String(req.nextUrl.searchParams.get("url") || "").trim();
    if (!raw) return jsonError("missing url", 400);

    const start = normalizeUrl(raw);
    if (isUnsafeHost(start.hostname)) return jsonError("unsafe/local hosts are blocked", 400);

    const queue: URL[] = [start];
    const seen = new Set<string>([start.toString()]);
    const pages: PageScan[] = [];
    const allHtml: string[] = [];
    const allAbsLinks: string[] = [];
    const forms: string[] = [];
    const telLinks: string[] = [];

    for (let i = 0; i < queue.length && i < 7; i += 1) {
      const pageUrl = queue[i];
      const { response, html } = await fetchHtml(pageUrl);
      if (!html) {
        pages.push({ url: response.url || pageUrl.toString(), status: response.status, title: "", bytes: 0, hasViewport: false, hasContactWords: false, hasForm: false, hasOldMarkup: false });
        continue;
      }

      const finalUrl = new URL(response.url || pageUrl.toString());
      const hrefs = extractHrefs(html);
      const absLinks = hrefs.map((href) => absolute(finalUrl, href)).filter((url): url is URL => Boolean(url));
      const sameHostContactLinks = absLinks.filter((url) => url.hostname === start.hostname && CONTACT_WORDS.test(url.pathname + url.search));

      for (const url of sameHostContactLinks) {
        const value = url.toString();
        if (!seen.has(value) && queue.length < 7) {
          seen.add(value);
          queue.push(url);
        }
      }

      for (const url of absLinks) {
        if (url.protocol === "tel:") telLinks.push(url.toString());
        if (["http:", "https:"].includes(url.protocol)) allAbsLinks.push(url.toString());
      }

      forms.push(...extractFormActions(html, finalUrl));
      allHtml.push(html);
      pages.push({
        url: finalUrl.toString(),
        status: response.status,
        title: extractTitle(html),
        bytes: html.length,
        hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
        hasContactWords: CONTACT_WORDS.test(html),
        hasForm: /<form\b/i.test(html),
        hasOldMarkup: /<font\b|<center\b|<frameset\b|generator["'][^>]*(frontpage|dreamweaver)|table\s+[^>]*(width=|cellpadding=)/i.test(html),
      });
    }

    const emails = findEmails(allHtml.join("\n"));
    const contactForms = uniq(forms.filter((url) => CONTACT_WORDS.test(url) || forms.length === 1), 5);
    const contactsFromLinks = uniq(allAbsLinks.filter((url) => CONTACT_WORDS.test(url) && new URL(url).hostname === start.hostname), 6);
    const socials = socialLinks(allAbsLinks);
    const quality = qualityFromPages(start, pages, emails, [...contactForms, ...contactsFromLinks], telLinks);

    const contactStatus = emails.length ? "email" : contactForms.length || contactsFromLinks.length ? "form" : telLinks.length ? "phone" : "website";

    return NextResponse.json({
      ok: true,
      url: start.toString(),
      finalUrl: pages[0]?.url || start.toString(),
      title: pages[0]?.title || "",
      emails,
      contactFormUrl: contactForms[0] || contactsFromLinks[0] || "",
      contactForms: uniq([...contactForms, ...contactsFromLinks], 8),
      phoneLinks: uniq(telLinks, 6),
      facebookUrl: socials.facebookUrl,
      instagramUrl: socials.instagramUrl,
      linkedinUrl: socials.linkedinUrl,
      contactStatus,
      pagesScanned: pages,
      ...quality,
      scannedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return jsonError(error?.name === "AbortError" ? "contact scan timed out" : error?.message || "contact scan failed", authStatus(error));
  }
}
