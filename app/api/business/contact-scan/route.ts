import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { normalizePublicHttpUrl, safeFetchText } from "@/lib/safeFetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PageScan = {
  url: string;
  status: number;
  title: string;
  bytes: number;
  responseMs: number;
  hasViewport: boolean;
  hasMetaDescription: boolean;
  hasH1: boolean;
  hasContactWords: boolean;
  hasForm: boolean;
  hasOldMarkup: boolean;
};

type StructuredContacts = {
  emails: string[];
  phones: string[];
  urls: string[];
  socials: string[];
};

const CONTACT_WORDS = /contact|contacts|contact-us|yhteys|yhteystiedot|ota-yhteytta|ota-yhteyttä|asiakaspalvelu|about|meista|meistä|tiimi|team|varaus|booking|quote|request-quote|tarjous|lomake|message|viesti|support|help|customer-service/i;
const EMAIL_RE = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
const BAD_EMAIL_PARTS = [
  "example.com", "example.fi", "sentry.io", "wixpress.com", "schema.org", "domain.com", "yourdomain",
  "email.com", "test.com", "placeholder", "cloudflare", "wordpress.org", "gmail.con", "invalid.",
  "noreply@", "no-reply@", "donotreply@", "do-not-reply@",
];
const COMMON_PATHS = [
  "/contact", "/contact-us", "/contacts", "/yhteystiedot", "/yhteys", "/ota-yhteytta", "/ota-yhteyttä",
  "/about", "/about-us", "/meista", "/meistä", "/team", "/booking", "/varaus", "/request-a-quote", "/tarjouspyynto",
];

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function uniq(values: string[], max = 20) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = String(raw || "").trim();
    const key = value.toLowerCase().replace(/\/$/, "");
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function decodeLite(value: string) {
  return value
    .replace(/&#x40;|&#64;|&commat;/gi, "@")
    .replace(/&#x2e;|&#46;|&period;/gi, ".")
    .replace(/&#x3a;|&#58;/gi, ":")
    .replace(/&#x2f;|&#47;/gi, "/")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}

function decodeJsEscapes(value: string) {
  return value
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\\//g, "/");
}

function decodeCloudflare(value: string) {
  if (!/^[0-9a-f]{4,}$/i.test(value) || value.length % 2 !== 0) return "";
  const key = Number.parseInt(value.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < value.length; i += 2) out += String.fromCharCode(Number.parseInt(value.slice(i, i + 2), 16) ^ key);
  return out;
}

function absolute(base: URL, href: string) {
  try {
    const decoded = decodeLite(decodeJsEscapes(href)).trim();
    if (!decoded || decoded.startsWith("javascript:") || decoded.startsWith("data:")) return null;
    const url = new URL(decoded, base);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function sameSite(a: URL, b: URL) {
  const normalize = (host: string) => host.toLowerCase().replace(/^www\./, "");
  return normalize(a.hostname) === normalize(b.hostname);
}

function extractTitle(html: string) {
  return decodeLite(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
}

function extractHrefs(html: string) {
  return Array.from(html.matchAll(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)).map((m) => decodeLite(m[1] || ""));
}

function walkStructured(value: unknown, output: StructuredContacts) {
  if (Array.isArray(value)) {
    for (const item of value) walkStructured(item, output);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const low = key.toLowerCase();
    const values = Array.isArray(raw) ? raw : [raw];
    if (low === "email") output.emails.push(...values.map(String));
    if (["telephone", "phone", "faxnumber"].includes(low)) output.phones.push(...values.map(String));
    if (["sameas"].includes(low)) output.socials.push(...values.map(String));
    if (["url", "contactpoint"].includes(low)) output.urls.push(...values.filter((item) => typeof item === "string").map(String));
    walkStructured(raw, output);
  }
}

function extractStructured(html: string) {
  const output: StructuredContacts = { emails: [], phones: [], urls: [], socials: [] };
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeLite(match[1] || "").trim();
    if (!raw) continue;
    try {
      walkStructured(JSON.parse(raw), output);
    } catch {
      for (const email of raw.match(EMAIL_RE) || []) output.emails.push(email);
      for (const url of raw.match(/https?:\\?\/\\?\/[^"'\s<>]+/gi) || []) output.urls.push(decodeJsEscapes(url));
    }
  }
  return output;
}

function cleanEmail(email: string) {
  let decoded = decodeLite(decodeJsEscapes(email));
  try { decoded = decodeURIComponent(decoded); } catch {}
  return decoded
    .replace(/^mailto:/i, "")
    .split("?")[0]
    .replace(/[\s<>{}\[\](),;:'\"]+$/g, "")
    .replace(/^[\s<>{}\[\](),;:'\"]+/g, "")
    .toLowerCase();
}

function validEmail(email: string) {
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(email)) return false;
  if (email.length > 180 || email.includes("..")) return false;
  if (BAD_EMAIL_PARTS.some((bad) => email.includes(bad))) return false;
  if (/\.(png|jpg|jpeg|gif|webp|svg|css|js|woff2?|ttf)$/i.test(email)) return false;
  return true;
}

function findEmails(html: string, host: string, structured: StructuredContacts) {
  const raw = decodeLite(decodeJsEscapes(html));
  const deobfuscated = raw
    .replace(/(?:\[at\]|\(at\)|\{at\}|\[ät\]|\(ät\)|\{ät\})/gi, "@")
    .replace(/(?:\[dot\]|\(dot\)|\{dot\}|\[piste\]|\(piste\)|\{piste\})/gi, ".")
    .replace(/\s+(?:at|ät|miukumauku)\s+/gi, "@")
    .replace(/\s+(?:dot|piste)\s+/gi, ".")
    .replace(/(?:\[miukumauku\]|\(miukumauku\)|\{miukumauku\})/gi, "@");
  const visibleText = deobfuscated.replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
  const concatenated = Array.from(raw.matchAll(/["']([a-z0-9.!#$%&'*+/=?^_`{|}~-]+)["']\s*\+\s*["']@["']\s*\+\s*["']([a-z0-9.-]+\.[a-z]{2,})["']/gi)).map((match) => `${match[1]}@${match[2]}`);
  const candidates = [
    ...(raw.match(EMAIL_RE) || []),
    ...(deobfuscated.match(EMAIL_RE) || []),
    ...(visibleText.match(EMAIL_RE) || []),
    ...concatenated,
    ...structured.emails,
    ...Array.from(raw.matchAll(/mailto:([^"'\s<>]+)/gi)).map((m) => m[1] || ""),
    ...Array.from(raw.matchAll(/data-(?:email|mail)=["']([^"']+)["']/gi)).map((m) => m[1] || ""),
    ...Array.from(raw.matchAll(/data-cfemail=["']([0-9a-f]+)["']/gi)).map((m) => decodeCloudflare(m[1] || "")),
  ];
  const domain = host.replace(/^www\./, "");
  return uniq(candidates.map(cleanEmail).filter(validEmail), 30)
    .sort((a, b) => {
      const score = (email: string) => {
        let value = 0;
        if (email.endsWith(`@${domain}`)) value += 30;
        if (/^(info|contact|hello|sales|office|asiakaspalvelu|myynti|toimisto|varaus|booking)@/.test(email)) value += 16;
        if (/^(admin|webmaster|privacy|gdpr)@/.test(email)) value -= 4;
        return value;
      };
      return score(b) - score(a);
    })
    .slice(0, 12);
}

function normalizePhone(value: string) {
  const decoded = decodeLite(value).replace(/^tel:/i, "").split("?")[0].trim();
  const compact = decoded.replace(/[^0-9+]/g, "");
  if (compact.replace(/\D/g, "").length < 7 || compact.replace(/\D/g, "").length > 15) return "";
  return decoded.replace(/\s+/g, " ").slice(0, 40);
}

function findPhones(html: string, structured: StructuredContacts) {
  const raw = decodeLite(html);
  const candidates = [
    ...structured.phones,
    ...Array.from(raw.matchAll(/href=["']tel:([^"']+)["']/gi)).map((m) => m[1] || ""),
    ...Array.from(raw.matchAll(/(?:puhelin|phone|tel\.?|puh\.?)[\s:]*((?:\+?\d[\d ().-]{6,}\d))/gi)).map((m) => m[1] || ""),
  ];
  return uniq(candidates.map(normalizePhone).filter(Boolean), 12);
}

function extractContactForms(html: string, pageUrl: URL) {
  const pageUrls: string[] = [];
  const endpoints: string[] = [];
  for (const match of html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)) {
    const form = match[0];
    const action = form.match(/\saction\s*=\s*["']([^"']*)["']/i)?.[1] || "";
    const fields = Array.from(form.matchAll(/<(?:input|textarea|select)\b[^>]*(?:name|id|placeholder)\s*=\s*["']([^"']+)["'][^>]*>/gi)).map((m) => m[1] || "").join(" ");
    const looksContact = CONTACT_WORDS.test(form) || /email|e-mail|phone|puhelin|message|viesti|name|nimi|subject|aihe/i.test(fields) || /<textarea\b/i.test(form);
    if (!looksContact) continue;
    pageUrls.push(pageUrl.toString());
    const target = action ? absolute(pageUrl, action) : pageUrl;
    if (target && ["http:", "https:"].includes(target.protocol)) endpoints.push(target.toString());
  }
  return { pageUrls, endpoints };
}

function socialLinks(urls: string[]) {
  const clean = uniq(urls.map((href) => decodeJsEscapes(href).split("#")[0].replace(/\/$/, "")), 100);
  const find = (pattern: RegExp, reject?: RegExp) => clean.find((href) => pattern.test(href) && !(reject?.test(href))) || "";
  return {
    facebookUrl: find(/https?:\/\/(?:www\.|m\.)?facebook\.com\//i, /\/sharer|\/plugins|\/dialog/i),
    instagramUrl: find(/https?:\/\/(?:www\.)?instagram\.com\//i),
    linkedinUrl: find(/https?:\/\/(?:www\.)?linkedin\.com\//i),
    tiktokUrl: find(/https?:\/\/(?:www\.)?tiktok\.com\//i),
    whatsappUrl: find(/https?:\/\/(?:wa\.me|api\.whatsapp\.com)\//i),
    messengerUrl: find(/https?:\/\/(?:m\.me|messenger\.com)\//i),
  };
}

function qualityFromPages(root: URL, pages: PageScan[], emails: string[], forms: string[], phones: string[]) {
  const first = pages[0];
  let upgradeScore = 18;
  const notes: string[] = [];
  if (root.protocol !== "https:") { upgradeScore += 12; notes.push("not HTTPS"); }
  if (!first?.title || first.title.length < 8) { upgradeScore += 8; notes.push("missing or weak page title"); }
  if (!first?.hasMetaDescription) { upgradeScore += 6; notes.push("meta description missing"); }
  if (!first?.hasH1) { upgradeScore += 6; notes.push("main heading missing"); }
  if (pages.some((p) => !p.hasViewport)) { upgradeScore += 23; notes.push("mobile viewport missing"); }
  if (!emails.length && !forms.length && !phones.length) { upgradeScore += 22; notes.push("no clear email, form, or phone link found"); }
  if (!pages.some((p) => p.hasContactWords)) { upgradeScore += 8; notes.push("contact path is hard to find"); }
  if (first && first.bytes > 0 && first.bytes < 4500) { upgradeScore += 10; notes.push("very small/simple homepage"); }
  if (pages.some((p) => p.hasOldMarkup)) { upgradeScore += 14; notes.push("old HTML/layout signals"); }
  if (pages.some((p) => p.status >= 400)) { upgradeScore += 8; notes.push("some useful pages returned errors"); }
  if (first?.responseMs && first.responseMs > 3500) { upgradeScore += 9; notes.push("slow server response"); }
  const score = Math.max(0, Math.min(100, upgradeScore));
  const siteQuality = score >= 62 ? "weak" : score >= 40 ? "needs_review" : "ok";
  return { upgradeScore: score, siteQuality, siteNotes: notes.length ? notes.join(" · ") : "Basic technical and contact signals look okay; inspect the visual design manually." };
}

async function discoverSitemapCandidates(root: URL) {
  const candidates: URL[] = [];
  const sitemapUrls: URL[] = [new URL("/sitemap.xml", root)];
  try {
    const robots = await safeFetchText(new URL("/robots.txt", root), { timeoutMs: 4500, maxBytes: 80_000, acceptContentTypes: /text|xml/i });
    for (const match of robots.body.matchAll(/^\s*sitemap:\s*(\S+)/gim)) {
      const url = absolute(root, match[1] || "");
      if (url && sameSite(root, url)) sitemapUrls.push(url);
    }
  } catch {}
  for (const sitemapUrl of uniq(sitemapUrls.map(String), 2)) {
    try {
      const sitemap = await safeFetchText(sitemapUrl, { timeoutMs: 5500, maxBytes: 240_000, acceptContentTypes: /xml|text/i });
      for (const match of sitemap.body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
        const url = absolute(root, match[1] || "");
        if (url && sameSite(root, url) && CONTACT_WORDS.test(url.pathname + url.search)) candidates.push(url);
      }
    } catch {}
  }
  return candidates.slice(0, 8);
}

async function scanWebsite(raw: string) {
  const start = normalizePublicHttpUrl(raw);
  const queue: URL[] = [start];
  const seen = new Set<string>();
  const pages: PageScan[] = [];
  const htmlPages: Array<{ html: string; url: URL }> = [];
  const allHttpLinks: string[] = [];
  const allSocialLinks: string[] = [];
  const formPages: string[] = [];
  const formEndpoints: string[] = [];
  const structured: StructuredContacts = { emails: [], phones: [], urls: [], socials: [] };

  const enqueue = (url: URL | null) => {
    if (!url || !["http:", "https:"].includes(url.protocol) || !sameSite(start, url)) return;
    const key = url.toString().replace(/\/$/, "");
    if (seen.has(key) || queue.some((item) => item.toString().replace(/\/$/, "") === key) || queue.length >= 14) return;
    queue.push(url);
  };

  const sitemapCandidates = await discoverSitemapCandidates(start);
  sitemapCandidates.forEach(enqueue);
  COMMON_PATHS.forEach((path) => enqueue(new URL(path, start)));

  for (let index = 0; index < queue.length && pages.length < 12; index += 1) {
    const pageUrl = queue[index];
    const key = pageUrl.toString().replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const started = Date.now();
    try {
      const result = await safeFetchText(pageUrl, {
        timeoutMs: 7500,
        maxBytes: 260_000,
        acceptContentTypes: /text\/html|application\/xhtml\+xml|text\/plain/i,
      });
      const html = result.body;
      const finalUrl = result.url;
      if (!html) {
        pages.push({ url: finalUrl.toString(), status: result.response.status, title: "", bytes: 0, responseMs: Date.now() - started, hasViewport: false, hasMetaDescription: false, hasH1: false, hasContactWords: false, hasForm: false, hasOldMarkup: false });
        continue;
      }
      const localStructured = extractStructured(html);
      structured.emails.push(...localStructured.emails);
      structured.phones.push(...localStructured.phones);
      structured.urls.push(...localStructured.urls);
      structured.socials.push(...localStructured.socials);
      const hrefs = extractHrefs(html);
      const absoluteLinks = hrefs.map((href) => absolute(finalUrl, href)).filter((url): url is URL => Boolean(url));
      for (const url of absoluteLinks) {
        if (["http:", "https:"].includes(url.protocol)) {
          allHttpLinks.push(url.toString());
          if (sameSite(start, url) && CONTACT_WORDS.test(url.pathname + url.search)) enqueue(url);
          else if (!sameSite(start, url)) allSocialLinks.push(url.toString());
        }
      }
      const forms = extractContactForms(html, finalUrl);
      formPages.push(...forms.pageUrls);
      formEndpoints.push(...forms.endpoints);
      htmlPages.push({ html, url: finalUrl });
      pages.push({
        url: finalUrl.toString(),
        status: result.response.status,
        title: extractTitle(html),
        bytes: result.bytes,
        responseMs: Date.now() - started,
        hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
        hasMetaDescription: /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html) || /<meta[^>]+content=["'][^"']{20,}["'][^>]+name=["']description["']/i.test(html),
        hasH1: /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html),
        hasContactWords: CONTACT_WORDS.test(html),
        hasForm: forms.pageUrls.length > 0,
        hasOldMarkup: /<font\b|<center\b|<frameset\b|generator["'][^>]*(frontpage|dreamweaver)|table\s+[^>]*(width=|cellpadding=)/i.test(html),
      });
    } catch (error) {
      pages.push({ url: pageUrl.toString(), status: 0, title: "", bytes: 0, responseMs: Date.now() - started, hasViewport: false, hasMetaDescription: false, hasH1: false, hasContactWords: false, hasForm: false, hasOldMarkup: false });
      if (pages.length === 1) throw error;
    }
  }

  const combinedHtml = htmlPages.map((entry) => entry.html).join("\n");
  const emails = findEmails(combinedHtml, start.hostname, structured);
  const phones = findPhones(combinedHtml, structured);
  const contactPageLinks = allHttpLinks.filter((value) => {
    try {
      const url = new URL(value);
      return sameSite(start, url) && CONTACT_WORDS.test(url.pathname + url.search);
    } catch { return false; }
  });
  const contactForms = uniq([...formPages, ...contactPageLinks, ...formEndpoints], 12);
  const socials = socialLinks([...allSocialLinks, ...structured.socials, ...structured.urls]);
  const quality = qualityFromPages(start, pages, emails, contactForms, phones);
  const contactStatus = emails.length ? "email" : contactForms.length ? "form" : phones.length ? "phone" : (socials.facebookUrl || socials.instagramUrl || socials.whatsappUrl) ? "social" : "website";

  return {
    ok: true,
    url: start.toString(),
    finalUrl: pages.find((page) => page.status > 0)?.url || start.toString(),
    title: pages.find((page) => page.title)?.title || "",
    emails,
    phones,
    phoneLinks: phones.map((phone) => `tel:${phone.replace(/[^0-9+]/g, "")}`),
    contactFormUrl: contactForms[0] || "",
    contactForms,
    facebookUrl: socials.facebookUrl,
    instagramUrl: socials.instagramUrl,
    linkedinUrl: socials.linkedinUrl,
    tiktokUrl: socials.tiktokUrl,
    whatsappUrl: socials.whatsappUrl,
    messengerUrl: socials.messengerUrl,
    contactStatus,
    pagesScanned: pages,
    ...quality,
    scannedAt: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const raw = String(req.nextUrl.searchParams.get("url") || "").trim();
    if (!raw) return jsonError("missing url", 400);
    return NextResponse.json(await scanWebsite(raw));
  } catch (error: any) {
    return jsonError(error?.name === "AbortError" ? "contact scan timed out" : error?.message || "contact scan failed", authStatus(error));
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items.slice(0, 8) : [];
    if (!items.length) return jsonError("items must contain 1-4 websites", 400);
    const results = await Promise.all(items.map(async (item: any) => {
      const id = String(item?.id || "").slice(0, 200);
      const url = String(item?.url || "").trim();
      if (!url) return { id, ok: false, error: "missing url" };
      try {
        return { id, ...(await scanWebsite(url)) };
      } catch (error: any) {
        return { id, ok: false, error: error?.name === "AbortError" ? "scan timed out" : error?.message || "scan failed" };
      }
    }));
    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    return jsonError(error?.message || "bulk contact scan failed", authStatus(error));
  }
}
