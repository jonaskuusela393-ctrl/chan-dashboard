import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

function unsafeTarget(message: string): never {
  const error = new Error(message);
  (error as Error & { status?: number }).status = 400;
  throw error;
}

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  acceptContentTypes?: RegExp;
};

export type SafeFetchResult = {
  response: Response;
  url: URL;
  body: string;
  bytes: number;
  truncated: boolean;
};

function ipv4ToNumber(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function inV4Range(ip: string, base: string, bits: number) {
  const value = ipv4ToNumber(ip);
  const start = ipv4ToNumber(base);
  if (value == null || start == null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
  return (value & mask) === (start & mask);
}

function expandIpv6(input: string) {
  let ip = input.toLowerCase().split("%")[0];
  if (ip.startsWith("::ffff:") && net.isIP(ip.slice(7)) === 4) return { mappedV4: ip.slice(7), groups: [] as number[] };
  const [leftRaw, rightRaw = ""] = ip.split("::");
  if (ip.split("::").length > 2) return null;
  const left = leftRaw ? leftRaw.split(":") : [];
  const right = rightRaw ? rightRaw.split(":") : [];
  const parse = (part: string) => {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    return Number.parseInt(part, 16);
  };
  const leftNums = left.map(parse);
  const rightNums = right.map(parse);
  if (leftNums.some((v) => v == null) || rightNums.some((v) => v == null)) return null;
  const missing = 8 - left.length - right.length;
  if ((!ip.includes("::") && missing !== 0) || missing < 0) return null;
  return { mappedV4: "", groups: [...(leftNums as number[]), ...Array(missing).fill(0), ...(rightNums as number[])] };
}

function isPrivateIpv4(ip: string) {
  const blocked: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];
  return blocked.some(([base, bits]) => inV4Range(ip, base, bits));
}

function isPrivateIpv6(ip: string) {
  const parsed = expandIpv6(ip);
  if (!parsed) return true;
  if (parsed.mappedV4) return isPrivateIpv4(parsed.mappedV4);
  const g = parsed.groups;
  if (g.every((part) => part === 0)) return true; // ::
  if (g.slice(0, 7).every((part) => part === 0) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  return false;
}

export function normalizePublicHttpUrl(input: string | URL) {
  const url = input instanceof URL ? new URL(input) : new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  if (!['http:', 'https:'].includes(url.protocol)) unsafeTarget("only public http/https URLs are allowed");
  if (url.username || url.password) unsafeTarget("URLs with embedded credentials are blocked");
  url.hash = "";
  return url;
}

export async function assertPublicUrl(input: string | URL) {
  const url = normalizePublicHttpUrl(input);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home") || host.endsWith(".lan")) {
    unsafeTarget("local or internal hosts are blocked");
  }

  const ipType = net.isIP(host);
  const addresses = ipType ? [{ address: host, family: ipType }] : await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length) unsafeTarget("host did not resolve");
  for (const entry of addresses) {
    if (entry.family === 4 && isPrivateIpv4(entry.address)) unsafeTarget("private/reserved IPv4 destinations are blocked");
    if (entry.family === 6 && isPrivateIpv6(entry.address)) unsafeTarget("private/reserved IPv6 destinations are blocked");
  }
  return url;
}

async function readLimitedBytes(response: Response, maxBytes: number) {
  if (!response.body) return { bytesValue: new Uint8Array(), bytes: 0, truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const remaining = maxBytes - bytes;
    if (remaining <= 0) {
      truncated = true;
      await reader.cancel();
      break;
    }
    if (value.byteLength > remaining) {
      chunks.push(value.slice(0, remaining));
      bytes += remaining;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    bytes += value.byteLength;
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytesValue: merged, bytes, truncated };
}

function normaliseCharset(value: string) {
  const charset = value.trim().toLowerCase().replace(/["']/g, "");
  if (["iso-8859-1", "latin1", "latin-1", "windows-1252", "cp1252"].includes(charset)) return "windows-1252";
  if (["iso-8859-15", "latin9", "latin-9"].includes(charset)) return "iso-8859-15";
  if (["utf8", "utf-8"].includes(charset)) return "utf-8";
  return charset || "utf-8";
}

function decodeHtmlBytes(bytesValue: Uint8Array, contentType: string) {
  const headerCharset = contentType.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1] || "";
  const asciiProbe = new TextDecoder("windows-1252", { fatal: false }).decode(bytesValue.slice(0, 8192));
  const metaCharset = asciiProbe.match(/<meta[^>]+charset\s*=\s*["']?([^\s"'/>;]+)/i)?.[1]
    || asciiProbe.match(/<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([^\s"';>]+)/i)?.[1]
    || "";
  const candidates = [headerCharset, metaCharset, "utf-8", "windows-1252"].map(normaliseCharset);
  for (const charset of candidates) {
    try {
      return new TextDecoder(charset, { fatal: false }).decode(bytesValue);
    } catch {}
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytesValue);
}

export async function safeFetchText(input: string | URL, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const timeoutMs = Math.max(1000, Math.min(options.timeoutMs ?? 8000, 20000));
  const maxRedirects = Math.max(0, Math.min(options.maxRedirects ?? 5, 8));
  const maxBytes = Math.max(1024, Math.min(options.maxBytes ?? 250_000, 1_000_000));
  let url = await assertPublicUrl(input);

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "PrivateTerminalDashboard/2.0 (+website contact and quality audit)",
          Accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.8,*/*;q=0.1",
          "Accept-Language": "fi,en;q=0.8",
          ...options.headers,
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("redirect response did not include a location");
      if (redirect >= maxRedirects) throw new Error("too many redirects");
      url = await assertPublicUrl(new URL(location, url));
      continue;
    }

    const contentType = response.headers.get("content-type") || "";
    if (options.acceptContentTypes && contentType && !options.acceptContentTypes.test(contentType)) {
      return { response, url, body: "", bytes: 0, truncated: false };
    }
    const raw = await readLimitedBytes(response, maxBytes);
    return { response, url, body: decodeHtmlBytes(raw.bytesValue, contentType), bytes: raw.bytes, truncated: raw.truncated };
  }
  throw new Error("too many redirects");
}
