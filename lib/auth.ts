import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export type Role = "admin" | "user";
export type ModuleKey = "chat" | "youtube" | "business" | "email" | "dev" | "settings";

export type Session = {
  username: string;
  role: Role;
  exp: number;
};

export const SESSION_COOKIE = "black_terminal_session";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  chat: "Chat",
  youtube: "YouTube",
  business: "Client radar",
  email: "Email",
  dev: "Dev workspace",
  settings: "Settings",
};

export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
  admin: ["chat", "youtube", "business", "email", "dev", "settings"],
  user: ["chat"],
};

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

export function createSessionValue(username: string, role: Role) {
  const days = Math.max(1, Math.min(Number(process.env.SESSION_DAYS || 14), 365));
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

export function canAccess(session: Session | null, module: ModuleKey) {
  if (!session) return false;
  return ROLE_MODULES[session.role].includes(module);
}

export function isAdmin(session: Session | null) {
  return session?.role === "admin";
}

export function requireSession(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) throw new Error("Not logged in");
  return session;
}

export function requireAdmin(req: NextRequest) {
  const session = requireSession(req);
  if (session.role !== "admin") throw new Error("Admin only");
  return session;
}

export function requireModule(req: NextRequest, module: ModuleKey) {
  const session = requireSession(req);
  if (!canAccess(session, module)) throw new Error("Forbidden");
  return session;
}

export function authStatus(error: unknown) {
  const explicit = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 0;
  if (Number.isInteger(explicit) && explicit >= 400 && explicit <= 599) return explicit;
  const message = error instanceof Error ? error.message : String(error || "");
  if (message === "Not logged in") return 401;
  if (message === "Admin only" || message === "Forbidden") return 403;
  return 500;
}

export function verifyLogin(usernameInput: string, passwordInput: string): { username: string; role: Role } | null {
  const users = [
    { username: process.env.ADMIN_USERNAME || "", password: process.env.ADMIN_PASSWORD || "", role: "admin" as const },
    { username: process.env.FRIEND_USERNAME || process.env.USER_USERNAME || "", password: process.env.FRIEND_PASSWORD || process.env.USER_PASSWORD || "", role: "user" as const },
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
