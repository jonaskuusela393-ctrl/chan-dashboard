import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export type Session = {
  username: string;
  role: "admin" | "user";
  exp: number;
};

export const SESSION_COOKIE = "black_terminal_session";

function secret() {
  const value = process.env.AUTH_SECRET || "";
  if (value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return value;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function createSessionValue(username: string, role: "admin" | "user") {
  const days = Math.max(1, Math.min(Number(process.env.SESSION_DAYS || 30), 365));
  const payload = b64url(JSON.stringify({ username, role, exp: Date.now() + days * 86400000 }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionValue(value: string): Session | null {
  try {
    const [payload, sig] = value.split(".");
    if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed.username !== "string") return null;
    if (parsed.role !== "admin" && parsed.role !== "user") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { username: parsed.username, role: parsed.role, exp: parsed.exp };
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return verifySessionValue(jar.get(SESSION_COOKIE)?.value || "");
}

export function getSessionFromRequest(req: NextRequest) {
  return verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value || "");
}

export function requireSession(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) throw new Error("Not logged in");
  return session;
}

export function verifyLogin(usernameInput: string, passwordInput: string): { username: string; role: "admin" | "user" } | null {
  const users = [
    { username: process.env.ADMIN_USERNAME || "", password: process.env.ADMIN_PASSWORD || "", role: "admin" as const },
    { username: process.env.FRIEND_USERNAME || "", password: process.env.FRIEND_PASSWORD || "", role: "user" as const },
  ];

  const username = usernameInput.trim();
  const password = passwordInput;

  for (const user of users) {
    if (!user.username || !user.password) continue;
    if (safeEqual(username, user.username) && safeEqual(password, user.password)) {
      return { username: user.username, role: user.role };
    }
  }

  return null;
}
