CREATE TABLE IF NOT EXISTS viewport_deleted_items (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  scope TEXT NOT NULL,
  item_key TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(username, scope, item_key)
);

CREATE TABLE IF NOT EXISTS viewport_board_blocks (
  username TEXT NOT NULL,
  board TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(username, board)
);

CREATE TABLE IF NOT EXISTS viewport_disabled_targets (
  username TEXT NOT NULL,
  scope TEXT NOT NULL,
  target TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(username, scope, target)
);

CREATE TABLE IF NOT EXISTS viewport_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS viewport_presence (
  username TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS viewport_deleted_lookup_idx ON viewport_deleted_items(username, scope);
CREATE INDEX IF NOT EXISTS viewport_chat_created_idx ON viewport_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS viewport_blocks_lookup_idx ON viewport_board_blocks(username, board);
CREATE INDEX IF NOT EXISTS viewport_disabled_targets_lookup_idx ON viewport_disabled_targets(username, scope, target);
