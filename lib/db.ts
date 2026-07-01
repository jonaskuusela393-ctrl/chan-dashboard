import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;
let cachedSql: Sql | null | undefined;

function getSql() {
  if (cachedSql !== undefined) return cachedSql;
  const url = process.env.DATABASE_URL;
  cachedSql = url ? neon(url) : null;
  return cachedSql;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureDeletedTable() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not set");
  await sql`
    CREATE TABLE IF NOT EXISTS deleted_items (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      item_key TEXT NOT NULL,
      label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS deleted_items_scope_idx ON deleted_items(scope)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS deleted_items_scope_key_idx ON deleted_items(scope, item_key)`;
}

export async function listDeleted(scope: string) {
  const sql = getSql();
  if (!sql) return [] as { item_key: string; label: string | null; created_at: string }[];
  await ensureDeletedTable();
  const rows = await sql`
    SELECT item_key, label, created_at::text
    FROM deleted_items
    WHERE scope = ${scope}
    ORDER BY created_at DESC
  `;
  return rows as { item_key: string; label: string | null; created_at: string }[];
}

export async function addDeleted(scope: string, itemKey: string, label?: string) {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not set");
  await ensureDeletedTable();
  const id = `${scope}:${itemKey}`;
  await sql`
    INSERT INTO deleted_items (id, scope, item_key, label)
    VALUES (${id}, ${scope}, ${itemKey}, ${label || null})
    ON CONFLICT (id) DO NOTHING
  `;
}
