"use client";

type Entry = { t: number; expiresAt: number | null };
type Store = Record<string, Entry>;

function read(scope: string): Store {
  try {
    return JSON.parse(localStorage.getItem(scope) || "{}");
  } catch {
    return {};
  }
}

function write(scope: string, store: Store) {
  localStorage.setItem(scope, JSON.stringify(store));
}

export function isHidden(scope: string, id: string): boolean {
  const store = read(scope);
  const hit = store[id];
  if (!hit) return false;
  if (hit.expiresAt && Date.now() > hit.expiresAt) {
    delete store[id];
    write(scope, store);
    return false;
  }
  return true;
}

export function hide(scope: string, id: string, ttlDays?: number) {
  const store = read(scope);
  const expiresAt = ttlDays ? Date.now() + ttlDays * 24 * 60 * 60 * 1000 : null;
  store[id] = { t: Date.now(), expiresAt };
  write(scope, store);
}

export function unhide(scope: string, id: string) {
  const store = read(scope);
  delete store[id];
  write(scope, store);
}

export function clearHidden(scope: string) {
  localStorage.removeItem(scope);
}
