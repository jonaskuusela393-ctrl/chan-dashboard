"use client";

export async function loadDeleted(scope: string): Promise<Set<string>> {
  const res = await fetch(`/api/deleted?scope=${encodeURIComponent(scope)}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load deleted items");
  return new Set<string>(Array.isArray(data.keys) ? data.keys : []);
}

export async function deleteForever(scope: string, key: string, label?: string) {
  const res = await fetch("/api/deleted", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, key, label })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Delete failed");
  return data;
}
