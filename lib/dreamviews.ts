export const DV_BASE = "https://www.dreamviews.com";

export function normalizeDreamviewsPath(input: string | null): string {
  const raw = (input || "/forum.php").trim();
  if (!raw) return "/forum.php";
  try {
    const url = new URL(raw, DV_BASE);
    if (url.hostname !== "www.dreamviews.com" && url.hostname !== "dreamviews.com") return "/forum.php";
    return url.pathname + url.search;
  } catch {
    return "/forum.php";
  }
}

export function absoluteDvUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl || "/forum.php", DV_BASE).toString();
}

export function safeDreamviewsPath(href: string): string | null {
  try {
    const url = new URL(href, DV_BASE);
    if (url.hostname !== "www.dreamviews.com" && url.hostname !== "dreamviews.com") return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export function isBadDreamviewsPath(path: string) {
  const lower = path.toLowerCase();
  return [
    "member", "members", "register", "calendar", "search", "faq", "rules", "chat", "wiki",
    "rss", "newreply", "sendmessage", "login", "subscription", "private", "misc.php", "ajax.php"
  ].some((b) => lower.includes(b));
}
