"use client";

import { deleteForever, loadDeleted } from "@/lib/deletedClient";

const memoryCache = new Map<string, Set<string>>();

function cacheKey(scope: string) {
  return `deleted:${scope}`;
}

function cleanScope(scope: string) {
  return scope.trim().toLowerCase() || "default";
}

function cleanId(id: string) {
  return id.trim();
}

export async function loadHidden(scope: string): Promise<Set<string>> {
  const safeScope = cleanScope(scope);
  const deleted = await loadDeleted(safeScope);

  memoryCache.set(cacheKey(safeScope), deleted);

  return deleted;
}

export function isHidden(scope: string, id: string): boolean {
  const safeScope = cleanScope(scope);
  const safeId = cleanId(id);

  if (!safeId) return false;

  const cached = memoryCache.get(cacheKey(safeScope));
  return cached ? cached.has(safeId) : false;
}

export async function hide(scope: string, id: string, label?: string) {
  const safeScope = cleanScope(scope);
  const safeId = cleanId(id);

  if (!safeId) {
    throw new Error("Hide id is empty");
  }

  const key = cacheKey(safeScope);
  const cached = memoryCache.get(key) || new Set<string>();

  cached.add(safeId);
  memoryCache.set(key, cached);

  await deleteForever(safeScope, safeId, label || safeId);
}

export function unhide() {
  throw new Error("Unhide is disabled. Deleted items are permanent in this app.");
}

export function clearHidden() {
  throw new Error("Clear hidden is disabled. Deleted items are permanent in this app.");
}