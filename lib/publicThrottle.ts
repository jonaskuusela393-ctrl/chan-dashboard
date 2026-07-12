import "server-only";

const attempts = new Map<string, number[]>();

export function publicRequestAllowed(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => time > now - windowMs);
  if (recent.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    attempts.set(key, recent);
    return { allowed: false, retryAfter };
  }
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 2500) {
    for (const [entryKey, values] of attempts) {
      const active = values.filter((time) => time > now - windowMs);
      if (active.length) attempts.set(entryKey, active);
      else attempts.delete(entryKey);
    }
  }
  return { allowed: true, retryAfter: 0 };
}
