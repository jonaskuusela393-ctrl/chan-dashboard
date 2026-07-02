import { absoluteDvUrl, normalizeDreamviewsPath } from "@/lib/dreamviews";

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export async function fetchDreamviewsHtml(path: string, revalidate = 60) {
  const safePath = normalizeDreamviewsPath(path);
  const url = absoluteDvUrl(safePath);

  const options: NextFetchInit = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  };

  if (revalidate > 0) {
    options.next = { revalidate };
  } else {
    options.cache = "no-store";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const arrayBuffer = await res.arrayBuffer();
    const html = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);

    if (!res.ok) {
      const preview = html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 300);

      throw new Error(
        `DreamViews returned ${res.status} for ${safePath}${
          preview ? `: ${preview}` : ""
        }`
      );
    }

    return html;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(`DreamViews timed out for ${safePath}`);
    }

    throw new Error(error?.message || `DreamViews fetch failed for ${safePath}`);
  } finally {
    clearTimeout(timeout);
  }
}