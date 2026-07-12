import "server-only";
import crypto from "node:crypto";
import { getGmailConnection, saveGmailConnection } from "@/lib/businessSuite";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify";

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
};
type GmailMessage = {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
};

function config() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are required");
  return { clientId, clientSecret };
}

function authSecret() {
  const value = process.env.AUTH_SECRET || "";
  if (value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return value;
}

function sign(value: string) {
  return crypto.createHmac("sha256", authSecret()).update(value).digest("base64url");
}

export function createGoogleState(returnTo = "/business?section=inbox") {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 10 * 60_000, nonce: crypto.randomBytes(16).toString("hex"), returnTo: returnTo.startsWith("/") ? returnTo : "/business?section=inbox" })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyGoogleState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state");
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) throw new Error("Invalid OAuth state");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number; returnTo?: string };
  if (!parsed.exp || parsed.exp < Date.now()) throw new Error("OAuth state expired");
  return parsed.returnTo?.startsWith("/") ? parsed.returnTo : "/business?section=inbox";
}

export function googleAuthorizationUrl(redirectUri: string, returnTo?: string) {
  const { clientId } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    scope: `openid email ${GMAIL_SCOPE}`,
    state: createGoogleState(returnTo),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function tokenRequest(params: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(data.error_description || data.error || "Google token request failed"));
  return data;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = config();
  const data = await tokenRequest(new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }));
  const accessToken = String(data.access_token || "");
  if (!accessToken) throw new Error("Google did not return an access token");
  const profile = await gmailRequest<{ emailAddress?: string }>("/users/me/profile", {}, accessToken);
  await saveGmailConnection({
    email: String(profile.emailAddress || ""),
    accessToken,
    refreshToken: String(data.refresh_token || ""),
    expiresAt: new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString(),
    scope: String(data.scope || GMAIL_SCOPE),
  });
  return profile;
}

export async function validGmailAccessToken() {
  const connection = await getGmailConnection();
  if (!connection) throw new Error("Gmail is not connected");
  const expires = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
  if (connection.accessToken && expires > Date.now() + 90_000) return { token: connection.accessToken, connection };
  if (!connection.refreshToken) throw new Error("Gmail refresh token is missing. Disconnect and reconnect Gmail.");
  const { clientId, clientSecret } = config();
  const data = await tokenRequest(new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: connection.refreshToken, grant_type: "refresh_token" }));
  const accessToken = String(data.access_token || "");
  if (!accessToken) throw new Error("Google did not refresh the Gmail token");
  const next = { ...connection, accessToken, expiresAt: new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString(), scope: String(data.scope || connection.scope) };
  await saveGmailConnection(next);
  return { token: accessToken, connection: next };
}

export async function gmailRequest<T>(path: string, init: RequestInit = {}, tokenOverride = "") {
  const token = tokenOverride || (await validGmailAccessToken()).token;
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `Gmail API failed (${response.status})`);
  return data;
}

function decodeBase64Url(value: string) {
  try { return Buffer.from(value, "base64url").toString("utf8"); } catch { return ""; }
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function messageBody(part?: GmailPart): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
  const plain = part.parts?.map(messageBody).find((value) => value.trim());
  if (plain) return plain;
  if (part.mimeType === "text/html" && part.body?.data) return stripHtml(decodeBase64Url(part.body.data));
  for (const child of part.parts || []) {
    if (child.mimeType === "text/html" && child.body?.data) return stripHtml(decodeBase64Url(child.body.data));
  }
  if (part.body?.data) return stripHtml(decodeBase64Url(part.body.data));
  return "";
}

function headers(part?: GmailPart) {
  const result: Record<string, string> = {};
  for (const header of part?.headers || []) {
    const name = String(header.name || "").toLowerCase();
    if (name) result[name] = String(header.value || "");
  }
  return result;
}

export function normalizeGmailMessage(message: GmailMessage) {
  const h = headers(message.payload);
  const attachments: Array<{ filename: string; mimeType: string; attachmentId: string; size: number }> = [];
  const walk = (part?: GmailPart) => {
    if (!part) return;
    if (part.filename && part.body?.attachmentId) attachments.push({ filename: part.filename, mimeType: part.mimeType || "application/octet-stream", attachmentId: part.body.attachmentId, size: Number(part.body.size || 0) });
    for (const child of part.parts || []) walk(child);
  };
  walk(message.payload);
  return {
    id: String(message.id || ""),
    threadId: String(message.threadId || ""),
    from: h.from || "",
    to: h.to || "",
    cc: h.cc || "",
    subject: h.subject || "(no subject)",
    date: h.date || (message.internalDate ? new Date(Number(message.internalDate)).toISOString() : ""),
    messageIdHeader: h["message-id"] || "",
    references: h.references || "",
    inReplyTo: h["in-reply-to"] || "",
    snippet: message.snippet || "",
    body: messageBody(message.payload) || message.snippet || "",
    unread: (message.labelIds || []).includes("UNREAD"),
    labels: message.labelIds || [],
    attachments,
  };
}

export async function listGmailThreads(q = "in:inbox", maxResults = 20) {
  const params = new URLSearchParams({ q, maxResults: String(Math.max(1, Math.min(maxResults, 50))) });
  const list = await gmailRequest<{ threads?: Array<{ id?: string }> }>(`/users/me/threads?${params.toString()}`);
  const ids = (list.threads || []).map((item) => item.id).filter((id): id is string => Boolean(id));
  const threads = await Promise.all(ids.map(async (id) => {
    const thread = await gmailRequest<{ id?: string; messages?: GmailMessage[] }>(`/users/me/threads/${encodeURIComponent(id)}?format=full`);
    const messages = (thread.messages || []).map(normalizeGmailMessage);
    const latest = messages[messages.length - 1];
    return { id: thread.id || id, messages, latest, messageCount: messages.length, unread: messages.some((message) => message.unread) };
  }));
  return threads;
}

export async function getGmailThread(id: string) {
  const thread = await gmailRequest<{ id?: string; messages?: GmailMessage[] }>(`/users/me/threads/${encodeURIComponent(id)}?format=full`);
  return { id: thread.id || id, messages: (thread.messages || []).map(normalizeGmailMessage) };
}

function safeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendGmailMessage(input: { to: string; cc?: string; bcc?: string; subject: string; body: string; threadId?: string; inReplyTo?: string; references?: string }) {
  const { connection } = await validGmailAccessToken();
  const lines = [
    `From: ${safeHeader(connection.email)}`,
    `To: ${safeHeader(input.to)}`,
    input.cc ? `Cc: ${safeHeader(input.cc)}` : "",
    input.bcc ? `Bcc: ${safeHeader(input.bcc)}` : "",
    `Subject: ${safeHeader(input.subject)}`,
    input.inReplyTo ? `In-Reply-To: ${safeHeader(input.inReplyTo)}` : "",
    input.references ? `References: ${safeHeader(input.references)}` : "",
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.body.replace(/\r?\n/g, "\r\n"),
  ].filter(Boolean).join("\r\n");
  return gmailRequest<{ id?: string; threadId?: string }>("/users/me/messages/send", { method: "POST", body: JSON.stringify({ raw: Buffer.from(lines, "utf8").toString("base64url"), ...(input.threadId ? { threadId: input.threadId } : {}) }) });
}

export async function modifyGmailThread(id: string, addLabelIds: string[] = [], removeLabelIds: string[] = []) {
  return gmailRequest(`/users/me/threads/${encodeURIComponent(id)}/modify`, { method: "POST", body: JSON.stringify({ addLabelIds, removeLabelIds }) });
}

export async function getGmailAttachment(messageId: string, attachmentId: string) {
  const result = await gmailRequest<{ data?: string; size?: number }>(`/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`);
  return { data: Buffer.from(String(result.data || ""), "base64url"), size: Number(result.size || 0) };
}
