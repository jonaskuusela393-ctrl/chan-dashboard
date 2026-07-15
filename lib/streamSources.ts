export type StreamProvider = "twitch" | "kick" | "angelthump" | "embed";

export type StreamSource = {
  id: string;
  label: string;
  provider: StreamProvider;
  value: string;
  description: string;
  origin: "manual" | "gist";
  addedAt: string;
};

const CHANNEL_RE = /^[a-z0-9_]{2,40}$/i;
const PRIVATE_V4 = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

function cleanText(value: string, max: number) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function privateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (PRIVATE_V4.some((pattern) => pattern.test(host))) return true;
  return /^(fc|fd|fe8|fe9|fea|feb)[0-9a-f:]*$/i.test(host);
}

function sourceId(provider: StreamProvider, value: string) {
  let hash = 2166136261;
  const input = `${provider}:${value}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${provider}-${(hash >>> 0).toString(36)}`;
}

function urlFromLooseInput(raw: string) {
  if (/^https:\/\//i.test(raw)) return new URL(raw);
  if (/^(?:www\.)?(?:twitch\.tv|kick\.com)\//i.test(raw)) return new URL(`https://${raw}`);
  return null;
}

export function parseStreamSource(
  input: string,
  options: {
    label?: string;
    description?: string;
    origin?: "manual" | "gist";
    allowCustomEmbed?: boolean;
  } = {},
): StreamSource | null {
  const raw = input.trim();
  if (!raw) return null;

  const origin = options.origin || "manual";
  const description = cleanText(options.description || "", 240);
  const fallbackLabel = cleanText(options.label || "", 70);

  if (CHANNEL_RE.test(raw.replace(/^@/, "")) && !raw.includes(".")) {
    const channel = raw.replace(/^@/, "").toLowerCase();
    return {
      id: sourceId("twitch", channel),
      label: fallbackLabel || channel,
      provider: "twitch",
      value: channel,
      description,
      origin,
      addedAt: new Date().toISOString(),
    };
  }

  let url: URL | null = null;
  try {
    url = urlFromLooseInput(raw);
  } catch {
    return null;
  }
  if (!url || url.protocol !== "https:" || privateHostname(url.hostname)) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "twitch.tv" || host === "player.twitch.tv") {
    const candidate = url.searchParams.get("channel") || url.pathname.split("/").filter(Boolean)[0] || "";
    if (!CHANNEL_RE.test(candidate) || ["directory", "videos", "downloads", "settings"].includes(candidate.toLowerCase())) return null;
    const channel = candidate.toLowerCase();
    return {
      id: sourceId("twitch", channel),
      label: fallbackLabel || channel,
      provider: "twitch",
      value: channel,
      description,
      origin,
      addedAt: new Date().toISOString(),
    };
  }

  if (host === "kick.com" || host === "player.kick.com") {
    const candidate = url.pathname.split("/").filter(Boolean)[0] || "";
    if (!CHANNEL_RE.test(candidate)) return null;
    const channel = candidate.toLowerCase();
    return {
      id: sourceId("kick", channel),
      label: fallbackLabel || channel,
      provider: "kick",
      value: channel,
      description,
      origin,
      addedAt: new Date().toISOString(),
    };
  }

  if (host === "angelthump.com" || host.endsWith(".angelthump.com")) {
    const normalized = url.toString();
    return {
      id: sourceId("angelthump", normalized),
      label: fallbackLabel || "AngelThump stream",
      provider: "angelthump",
      value: normalized,
      description,
      origin,
      addedAt: new Date().toISOString(),
    };
  }

  if (!options.allowCustomEmbed) return null;
  const normalized = url.toString();
  return {
    id: sourceId("embed", normalized),
    label: fallbackLabel || url.hostname,
    provider: "embed",
    value: normalized,
    description,
    origin,
    addedAt: new Date().toISOString(),
  };
}

export function streamPlayerUrl(source: StreamSource, parentHost: string) {
  if (source.provider === "twitch") {
    return `https://player.twitch.tv/?channel=${encodeURIComponent(source.value)}&parent=${encodeURIComponent(parentHost)}&autoplay=false`;
  }
  if (source.provider === "kick") {
    return `https://player.kick.com/${encodeURIComponent(source.value)}`;
  }
  return source.value;
}

export function streamPublicUrl(source: StreamSource) {
  if (source.provider === "twitch") return `https://www.twitch.tv/${source.value}`;
  if (source.provider === "kick") return `https://kick.com/${source.value}`;
  return source.value;
}
