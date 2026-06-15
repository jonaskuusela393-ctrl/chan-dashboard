// lib/fetcher.js

const memoryCache = new Map();

/**
 * Smart fetch system:
 * - instant memory cache (fast navigation)
 * - Next.js server cache (revalidate)
 * - fallback if API fails
 */
export async function smartFetch(url, revalidate = 60) {
  const cached = memoryCache.get(url);

  // 1. Return memory cache if still fresh
  if (cached && Date.now() - cached.time < revalidate * 1000) {
    return cached.data;
  }

  try {
    const res = await fetch(url, {
      next: { revalidate }, // Next.js caching layer
    });

    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status}`);
    }

    const data = await res.json();

    // store in memory cache
    memoryCache.set(url, {
      data,
      time: Date.now(),
    });

    return data;
  } catch (err) {
    // fallback: return old cache if available
    if (cached) {
      return cached.data;
    }

    throw err;
  }
}