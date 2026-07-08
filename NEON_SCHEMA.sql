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

-- Local business money dashboard / CRM leads.
-- Safe to run more than once. Existing older projects get the new columns from ALTER TABLE below.
CREATE TABLE IF NOT EXISTS viewport_business_leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'business',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  contact_form_url TEXT NOT NULL DEFAULT '',
  facebook_url TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  contact_status TEXT NOT NULL DEFAULT 'unknown',
  site_quality TEXT NOT NULL DEFAULT 'unknown',
  site_notes TEXT NOT NULL DEFAULT '',
  last_scanned_at TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  maps_url TEXT NOT NULL DEFAULT '',
  rating DOUBLE PRECISION,
  user_rating_count INTEGER,
  lat DOUBLE PRECISION NOT NULL DEFAULT 0,
  lng DOUBLE PRECISION NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'saved',
  notes TEXT NOT NULL DEFAULT '',
  offer_price TEXT NOT NULL DEFAULT '300€',
  package_name TEXT NOT NULL DEFAULT 'Starter Website',
  next_follow_up TEXT NOT NULL DEFAULT '',
  last_contacted TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS contact_form_url TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS facebook_url TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS instagram_url TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS site_quality TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS site_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS last_scanned_at TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS offer_price TEXT NOT NULL DEFAULT '300€';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS package_name TEXT NOT NULL DEFAULT 'Starter Website';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS next_follow_up TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS last_contacted TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS viewport_business_leads_status_idx ON viewport_business_leads(status);
CREATE INDEX IF NOT EXISTS viewport_business_leads_followup_idx ON viewport_business_leads(next_follow_up);
CREATE INDEX IF NOT EXISTS viewport_business_leads_score_idx ON viewport_business_leads(score DESC);
CREATE INDEX IF NOT EXISTS viewport_business_leads_updated_idx ON viewport_business_leads(updated_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_leads_contact_status_idx ON viewport_business_leads(contact_status);
CREATE INDEX IF NOT EXISTS viewport_business_leads_site_quality_idx ON viewport_business_leads(site_quality);
