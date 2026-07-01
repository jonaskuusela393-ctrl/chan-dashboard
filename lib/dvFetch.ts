import { absoluteDvUrl } from "@/lib/dreamviews";

export async function fetchDreamviewsHtml(path: string, revalidate = 60) {
  const res = await fetch(absoluteDvUrl(path), {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome Safari private-readonly-dashboard",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    },
    next: { revalidate }
  });
  if (!res.ok) throw new Error(`DreamViews returned ${res.status} for ${path}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString("utf8");
}
