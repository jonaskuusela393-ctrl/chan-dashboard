export const DV_BASE = "https://www.dreamviews.com";

const ALLOWED_HOSTS = new Set(["www.dreamviews.com", "dreamviews.com"]);

const BAD_PATH_PARTS = [
  "member",
  "members",
  "register",
  "calendar",
  "search",
  "faq",
  "rules",
  "chat",
  "wiki",
  "rss",
  "newreply",
  "sendmessage",
  "login",
  "subscription",
  "private",
  "misc.php",
  "ajax.php",
  "attachment.php",
  "image.php",
  "external.php",
  "clientscript",
];

export function normalizeDreamviewsPath(input: string | null): string {
  const raw = (input || "/forum.php").trim();

  if (!raw) {
    return "/forum.php";
  }

  try {
    const url = new URL(raw, DV_BASE);

    if (!ALLOWED_HOSTS.has(url.hostname)) {
      return "/forum.php";
    }

    const path = `${url.pathname}${url.search}`;

    if (!path.startsWith("/")) {
      return "/forum.php";
    }

    if (path.includes("..")) {
      return "/forum.php";
    }

    if (isBadDreamviewsPath(path)) {
      return "/forum.php";
    }

    return path || "/forum.php";
  } catch {
    return "/forum.php";
  }
}

export function absoluteDvUrl(pathOrUrl: string): string {
  const path = normalizeDreamviewsPath(pathOrUrl);
  return new URL(path, DV_BASE).toString();
}

export function safeDreamviewsPath(href: string): string | null {
  const raw = (href || "").trim();

  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw, DV_BASE);

    if (!ALLOWED_HOSTS.has(url.hostname)) {
      return null;
    }

    const path = `${url.pathname}${url.search}`;

    if (!path.startsWith("/")) {
      return null;
    }

    if (path.includes("..")) {
      return null;
    }

    if (isBadDreamviewsPath(path)) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

export function isBadDreamviewsPath(path: string) {
  const lower = path.toLowerCase();

  return BAD_PATH_PARTS.some((bad) => lower.includes(bad));
}

export function isDreamviewsForumPath(path: string) {
  const lower = path.toLowerCase();

  if (isBadDreamviewsPath(lower)) {
    return false;
  }

  return (
    lower === "/forum.php" ||
    lower.includes("forumdisplay.php") ||
    lower.includes("/forums/") ||
    /^\/f\d+/i.test(lower)
  );
}

export function isDreamviewsThreadPath(path: string) {
  const lower = path.toLowerCase();

  if (isBadDreamviewsPath(lower)) {
    return false;
  }

  if (isDreamviewsForumPath(lower)) {
    return false;
  }

  return (
    lower.includes("showthread.php") ||
    lower.includes("/threads/") ||
    /^\/t\d+/i.test(lower) ||
    /\/\d+[-_a-z0-9]*\.html$/i.test(lower)
  );
}

export function decodeDreamviewsHtml(input: string) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function stripDreamviewsHtml(input: string) {
  return decodeDreamviewsHtml(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<img[^>]*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}