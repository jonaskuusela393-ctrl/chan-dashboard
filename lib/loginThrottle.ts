type Attempt = { failures: number; firstFailure: number; lockedUntil: number };

const globalState = globalThis as typeof globalThis & { __viewportLoginAttempts?: Map<string, Attempt> };
const attempts = globalState.__viewportLoginAttempts || new Map<string, Attempt>();
globalState.__viewportLoginAttempts = attempts;

const WINDOW_MS = 15 * 60 * 1000;
const MAX_KEYS = 5000;

function cleanup(now: number) {
  if (attempts.size < MAX_KEYS) return;
  for (const [key, value] of attempts) {
    if (value.lockedUntil < now && now - value.firstFailure > WINDOW_MS) attempts.delete(key);
  }
}

export function loginKey(ip: string, username: string) {
  return `${ip.slice(0, 120)}:${username.trim().toLowerCase().slice(0, 80)}`;
}

export function loginAllowed(key: string) {
  const now = Date.now();
  cleanup(now);
  const item = attempts.get(key);
  if (!item) return { allowed: true, retryAfter: 0 };
  if (item.lockedUntil > now) return { allowed: false, retryAfter: Math.max(1, Math.ceil((item.lockedUntil - now) / 1000)) };
  if (now - item.firstFailure > WINDOW_MS) {
    attempts.delete(key);
    return { allowed: true, retryAfter: 0 };
  }
  return { allowed: true, retryAfter: 0 };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const old = attempts.get(key);
  const item = !old || now - old.firstFailure > WINDOW_MS
    ? { failures: 1, firstFailure: now, lockedUntil: 0 }
    : { ...old, failures: old.failures + 1 };
  if (item.failures >= 5) {
    const exponent = Math.min(6, item.failures - 5);
    item.lockedUntil = now + Math.min(60 * 60 * 1000, 60_000 * 2 ** exponent);
  }
  attempts.set(key, item);
  return item;
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
