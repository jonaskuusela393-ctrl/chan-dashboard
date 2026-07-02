import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

type DeletedRow = {
  item_key: string;
  label: string | null;
  created_at: string;
};

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

function cleanScope(scope: string) {
  return scope.replace(/[^a-z0-9_-]/gi, "").slice(0, 50).toLowerCase() || "default";
}

export async function ensureDeletedTable() {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  await sql`
    CREATE TABLE IF NOT EXISTS deleted_items (
      id TEXT PRIMARY KEY,
      scope TEXT,
      item_key TEXT,
      label TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE deleted_items
    ADD COLUMN IF NOT EXISTS scope TEXT
  `;

  await sql`
    ALTER TABLE deleted_items
    ADD COLUMN IF NOT EXISTS item_key TEXT
  `;

  await sql`
    ALTER TABLE deleted_items
    ADD COLUMN IF NOT EXISTS label TEXT
  `;

  await sql`
    ALTER TABLE deleted_items
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
  `;

  await sql`
    UPDATE deleted_items
    SET scope = 'chan'
    WHERE scope IS NULL OR scope = ''
  `;

  await sql`
    UPDATE deleted_items
    SET item_key = id
    WHERE item_key IS NULL OR item_key = ''
  `;

  await sql`
    UPDATE deleted_items
    SET created_at = NOW()
    WHERE created_at IS NULL
  `;

  await sql`
    ALTER TABLE deleted_items
    ALTER COLUMN scope SET NOT NULL
  `;

  await sql`
    ALTER TABLE deleted_items
    ALTER COLUMN item_key SET NOT NULL
  `;

  await sql`
    ALTER TABLE deleted_items
    ALTER COLUMN created_at SET NOT NULL
  `;

  await sql`
    ALTER TABLE deleted_items
    ALTER COLUMN created_at SET DEFAULT NOW()
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS deleted_items_scope_idx
    ON deleted_items(scope)
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS deleted_items_scope_item_key_idx
    ON deleted_items(scope, item_key)
  `;
}

export async function listDeleted(scope: string): Promise<DeletedRow[]> {
  const sql = getSql();

  if (!sql) {
    return [];
  }

  const safeScope = cleanScope(scope);

  await ensureDeletedTable();

  const rows = await sql`
    SELECT item_key, label, created_at::text
    FROM deleted_items
    WHERE scope = ${safeScope}
    ORDER BY created_at DESC
  `;

  return rows as DeletedRow[];
}

export async function addDeleted(scope: string, itemKey: string, label?: string) {
  const sql = getSql();

  if (!sql) {
    throw new Error("DATABASE_URL is not set");
  }

  const safeScope = cleanScope(scope);
  const safeItemKey = itemKey.slice(0, 500);
  const id = `${safeScope}:${safeItemKey}`;

  await ensureDeletedTable();

  await sql`
    INSERT INTO deleted_items (id, scope, item_key, label)
    VALUES (${id}, ${safeScope}, ${safeItemKey}, ${label || null})
    ON CONFLICT (scope, item_key)
    DO UPDATE SET
      label = COALESCE(EXCLUDED.label, deleted_items.label)
  `;
}