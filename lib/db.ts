import "server-only";
import { neon } from "@neondatabase/serverless";

export type DeletedRow = { item_key: string; label: string | null; created_at: string };
export type BoardBlock = { board: string; expires_at: string | null; created_at: string };
export type DisabledTarget = { scope: string; target: string; expires_at: string | null; created_at: string };
export type ChatAttachment = { name: string; type: string; dataUrl: string; size: number };
export type ChatMessage = { id: number; username: string; role: string; body: string; attachments: ChatAttachment[]; created_at: string };
export type Presence = { username: string; role: string; online: boolean; last_seen: string };

type Sql = ReturnType<typeof neon>;
let cached: Sql | null | undefined;
let schemaReady = false;

function sql() {
  if (cached !== undefined) return cached;
  cached = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  return cached;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function cleanUser(value: string) {
  return value.replace(/[^a-z0-9._-]/gi, "").slice(0, 80).toLowerCase();
}
function cleanScope(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, "").slice(0, 80).toLowerCase();
}
function cleanBoard(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
}

export async function ensureSchema() {
  const db = sql();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (schemaReady) return;

  await db`CREATE TABLE IF NOT EXISTS viewport_deleted_items (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    scope TEXT NOT NULL,
    item_key TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(username, scope, item_key)
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_board_blocks (
    username TEXT NOT NULL,
    board TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(username, board)
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_chat_messages (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    body TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_presence (
    username TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_disabled_targets (
    username TEXT NOT NULL,
    scope TEXT NOT NULL,
    target TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(username, scope, target)
  )`;

  await db`CREATE INDEX IF NOT EXISTS viewport_deleted_lookup_idx ON viewport_deleted_items(username, scope)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_chat_created_idx ON viewport_chat_messages(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_blocks_lookup_idx ON viewport_board_blocks(username, board)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_disabled_targets_lookup_idx ON viewport_disabled_targets(username, scope, target)`;

  schemaReady = true;
}

export async function listDeleted(username: string, scope: string): Promise<DeletedRow[]> {
  const db = sql();
  if (!db) return [];
  await ensureSchema();
  return (await db`SELECT item_key, label, created_at::text FROM viewport_deleted_items WHERE username=${cleanUser(username)} AND scope=${cleanScope(scope)} ORDER BY created_at DESC`) as unknown as DeletedRow[];
}

export async function addDeleted(username: string, scope: string, itemKey: string, label?: string) {
  const db = sql();
  if (!db) throw new Error("DATABASE_URL is not set");
  await ensureSchema();
  await db`INSERT INTO viewport_deleted_items(username, scope, item_key, label)
    VALUES(${cleanUser(username)}, ${cleanScope(scope)}, ${itemKey.slice(0, 600)}, ${label?.slice(0, 300) || null})
    ON CONFLICT(username, scope, item_key) DO UPDATE SET label=COALESCE(EXCLUDED.label, viewport_deleted_items.label)`;
}

export async function listBoardBlocks(username: string): Promise<BoardBlock[]> {
  const db = sql();
  if (!db) return [];
  await ensureSchema();
  await db`DELETE FROM viewport_board_blocks WHERE expires_at IS NOT NULL AND expires_at <= NOW()`;
  return (await db`SELECT board, expires_at::text, created_at::text FROM viewport_board_blocks WHERE username=${cleanUser(username)} ORDER BY created_at DESC`) as unknown as BoardBlock[];
}

export async function setBoardBlock(username: string, boardInput: string, days: number | null) {
  const db = sql();
  if (!db) throw new Error("DATABASE_URL is not set");
  await ensureSchema();
  const board = cleanBoard(boardInput);
  if (!board) throw new Error("Bad board");
  if (days === null) {
    await db`INSERT INTO viewport_board_blocks(username, board, expires_at) VALUES(${cleanUser(username)}, ${board}, NULL)
      ON CONFLICT(username, board) DO UPDATE SET expires_at=NULL, created_at=NOW()`;
  } else {
    await db`INSERT INTO viewport_board_blocks(username, board, expires_at) VALUES(${cleanUser(username)}, ${board}, NOW() + (${String(days)} || ' days')::interval)
      ON CONFLICT(username, board) DO UPDATE SET expires_at=NOW() + (${String(days)} || ' days')::interval, created_at=NOW()`;
  }
}

export async function isBoardBlocked(username: string, boardInput: string) {
  const db = sql();
  if (!db) return false;
  await ensureSchema();
  const board = cleanBoard(boardInput);
  const rows = (await db`SELECT board FROM viewport_board_blocks WHERE username=${cleanUser(username)} AND board=${board} AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1`) as unknown as Array<{ board: string }> ;
  return rows.length > 0;
}


function cleanTarget(value: string) {
  return value.replace(/[^a-z0-9._-]/gi, "").slice(0, 100).toLowerCase();
}

export async function listDisabledTargets(username: string, scope: string): Promise<DisabledTarget[]> {
  const db = sql();
  if (!db) return [];
  await ensureSchema();
  await db`DELETE FROM viewport_disabled_targets WHERE expires_at IS NOT NULL AND expires_at <= NOW()`;
  return (await db`SELECT scope, target, expires_at::text, created_at::text FROM viewport_disabled_targets WHERE username=${cleanUser(username)} AND scope=${cleanScope(scope)} ORDER BY created_at DESC`) as unknown as DisabledTarget[];
}

export async function setDisabledTarget(username: string, scope: string, targetInput: string, days: number | null) {
  const db = sql();
  if (!db) throw new Error("DATABASE_URL is not set");
  await ensureSchema();
  const target = cleanTarget(targetInput);
  const clean = cleanScope(scope);
  if (!target || !clean) throw new Error("Bad disable target");
  if (days === null) {
    await db`INSERT INTO viewport_disabled_targets(username, scope, target, expires_at) VALUES(${cleanUser(username)}, ${clean}, ${target}, NULL)
      ON CONFLICT(username, scope, target) DO UPDATE SET expires_at=NULL, created_at=NOW()`;
  } else {
    await db`INSERT INTO viewport_disabled_targets(username, scope, target, expires_at) VALUES(${cleanUser(username)}, ${clean}, ${target}, NOW() + (${String(days)} || ' days')::interval)
      ON CONFLICT(username, scope, target) DO UPDATE SET expires_at=NOW() + (${String(days)} || ' days')::interval, created_at=NOW()`;
  }
}

export async function isTargetDisabled(username: string, scope: string, targetInput: string) {
  const db = sql();
  if (!db) return false;
  await ensureSchema();
  const target = cleanTarget(targetInput);
  const clean = cleanScope(scope);
  const rows = (await db`SELECT target FROM viewport_disabled_targets WHERE username=${cleanUser(username)} AND scope=${clean} AND target=${target} AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1`) as unknown as Array<{ target: string }>;
  return rows.length > 0;
}

export async function touchPresence(username: string, role: string) {
  const db = sql();
  if (!db) return;
  await ensureSchema();
  await db`INSERT INTO viewport_presence(username, role, last_seen) VALUES(${cleanUser(username)}, ${role}, NOW())
    ON CONFLICT(username) DO UPDATE SET role=EXCLUDED.role, last_seen=NOW()`;
}

export async function listPresence(): Promise<Presence[]> {
  const db = sql();
  if (!db) return [];
  await ensureSchema();
  const rows = await db`SELECT username, role, (last_seen > NOW() - INTERVAL '35 seconds') AS online, last_seen::text FROM viewport_presence ORDER BY username ASC`;
  return rows as unknown as Presence[];
}

function chatTtlHours() {
  const raw = Number(process.env.CHAT_TTL_HOURS || 0);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 24 * 365) : 0;
}

export async function listChatMessages(limit = 80): Promise<ChatMessage[]> {
  const db = sql();
  if (!db) return [];
  await ensureSchema();

  const ttl = chatTtlHours();
  if (ttl > 0) {
    await db`DELETE FROM viewport_chat_messages WHERE created_at < NOW() - (${String(ttl)} || ' hours')::interval`;
  }

  const rows = await db`SELECT id::int, username, role, body, attachments, created_at::text FROM viewport_chat_messages ORDER BY id DESC LIMIT ${Math.max(1, Math.min(limit, 200))}`;
  return (rows as unknown as ChatMessage[]).reverse();
}

export async function addChatMessage(username: string, role: string, body: string, attachments: ChatAttachment[]) {
  const db = sql();
  if (!db) throw new Error("DATABASE_URL is not set");
  await ensureSchema();
  const rows = await db`INSERT INTO viewport_chat_messages(username, role, body, attachments)
    VALUES(${cleanUser(username)}, ${role}, ${body.slice(0, 4000)}, ${JSON.stringify(attachments)}::jsonb)
    RETURNING id::int, username, role, body, attachments, created_at::text`;
  return (rows as unknown as ChatMessage[])[0];
}
