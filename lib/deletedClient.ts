export async function loadDeleted(scope: string): Promise<Set<string>> {
  const safeScope = scope.trim() || "default";

  const res = await fetch(`/api/deleted?scope=${encodeURIComponent(safeScope)}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await readJsonOrText(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not load deleted items"));
  }

  const keys = new Set<string>();

  if (Array.isArray(data.keys)) {
    for (const key of data.keys) {
      if (typeof key === "string" && key.trim()) {
        keys.add(key);
      }
    }
  }

  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (typeof item === "string" && item.trim()) {
        keys.add(item);
      } else if (
        item &&
        typeof item === "object" &&
        typeof item.item_key === "string"
      ) {
        keys.add(item.item_key);
      }
    }
  }

  return keys;
}

export async function deleteForever(scope: string, key: string, label?: string) {
  const safeScope = scope.trim() || "default";
  const safeKey = key.trim();

  if (!safeKey) {
    throw new Error("Delete key is empty");
  }

  const res = await fetch("/api/deleted", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      scope: safeScope,
      key: safeKey,
      itemKey: safeKey,
      label: label || null,
    }),
  });

  const data = await readJsonOrText(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Delete failed"));
  }

  return data;
}

async function readJsonOrText(res: Response): Promise<any> {
  const text = await res.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
    };
  }
}

function getErrorMessage(data: any, fallback: string) {
  if (data && typeof data.error === "string") {
    return data.error;
  }

  if (data && typeof data.message === "string") {
    return data.message;
  }

  return fallback;
}