import "server-only";

type TwitchToken = { accessToken: string; expiresAt: number };
type TwitchGame = { id: string; name: string; box_art_url?: string };
type TwitchStream = {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tags?: string[];
  is_mature?: boolean;
};

type ArtifactPayload = {
  configured: boolean;
  category: { id: string; name: string; boxArtUrl: string };
  streams: Array<{
    id: string;
    channel: string;
    displayName: string;
    title: string;
    viewers: number;
    startedAt: string;
    language: string;
    thumbnailUrl: string;
    tags: string[];
    mature: boolean;
  }>;
  message: string;
};

let cachedToken: TwitchToken | null = null;
let cachedStreams: { expiresAt: number; payload: ArtifactPayload } | null = null;

function credentials() {
  return {
    clientId: (process.env.TWITCH_CLIENT_ID || "").trim(),
    clientSecret: (process.env.TWITCH_CLIENT_SECRET || "").trim(),
  };
}

async function appToken(clientId: string, clientSecret: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.accessToken;
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" });
  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params.toString()}`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
  const data = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number; message?: string };
  if (!response.ok || !data.access_token) throw new Error(data.message || `Twitch token request failed (${response.status})`);
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(300, Number(data.expires_in || 3600)) * 1000,
  };
  return cachedToken.accessToken;
}

async function helix<T>(path: string, clientId: string, token: string): Promise<T> {
  const response = await fetch(`https://api.twitch.tv/helix${path}`, {
    cache: "no-store",
    headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (data as { message?: unknown }).message === "string" ? String((data as { message?: unknown }).message) : `Twitch API failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function getArtifactStreams(): Promise<ArtifactPayload> {
  if (cachedStreams && cachedStreams.expiresAt > Date.now()) return cachedStreams.payload;
  const { clientId, clientSecret } = credentials();
  if (!clientId || !clientSecret) {
    return {
      configured: false,
      category: { id: "", name: "Artifact", boxArtUrl: "" },
      streams: [],
      message: "Add TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET to list live Artifact-category streams automatically.",
    };
  }

  const token = await appToken(clientId, clientSecret);
  const games = await helix<{ data?: TwitchGame[] }>(`/games?name=${encodeURIComponent("Artifact")}`, clientId, token);
  const game = games.data?.find((item) => item.name.toLowerCase() === "artifact") || games.data?.[0];
  if (!game) {
    const payload = { configured: true, category: { id: "", name: "Artifact", boxArtUrl: "" }, streams: [], message: "Twitch did not return an Artifact category." };
    cachedStreams = { expiresAt: Date.now() + 60_000, payload };
    return payload;
  }

  const result = await helix<{ data?: TwitchStream[] }>(`/streams?game_id=${encodeURIComponent(game.id)}&first=100`, clientId, token);
  const streams = (result.data || []).map((stream) => ({
    id: stream.id,
    channel: stream.user_login,
    displayName: stream.user_name,
    title: stream.title,
    viewers: stream.viewer_count,
    startedAt: stream.started_at,
    language: stream.language,
    thumbnailUrl: stream.thumbnail_url.replace("{width}", "640").replace("{height}", "360"),
    tags: Array.isArray(stream.tags) ? stream.tags.slice(0, 8) : [],
    mature: Boolean(stream.is_mature),
  }));
  const payload = {
    configured: true,
    category: {
      id: game.id,
      name: game.name,
      boxArtUrl: (game.box_art_url || "").replace("{width}", "285").replace("{height}", "380"),
    },
    streams,
    message: streams.length ? "" : "No Artifact-category channels are live right now. Saved channels can still be opened below.",
  };
  cachedStreams = { expiresAt: Date.now() + 45_000, payload };
  return payload;
}
