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
  linkedin_url TEXT NOT NULL DEFAULT '',
  tiktok_url TEXT NOT NULL DEFAULT '',
  whatsapp_url TEXT NOT NULL DEFAULT '',
  messenger_url TEXT NOT NULL DEFAULT '',
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
  offer_price TEXT NOT NULL DEFAULT '1,490€',
  package_name TEXT NOT NULL DEFAULT 'Complete Business Website',
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
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS tiktok_url TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS whatsapp_url TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS messenger_url TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS site_quality TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS site_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS last_scanned_at TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS offer_price TEXT NOT NULL DEFAULT '1,490€';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS package_name TEXT NOT NULL DEFAULT 'Complete Business Website';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS next_follow_up TEXT NOT NULL DEFAULT '';
ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS last_contacted TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS viewport_business_leads_status_idx ON viewport_business_leads(status);
CREATE INDEX IF NOT EXISTS viewport_business_leads_followup_idx ON viewport_business_leads(next_follow_up);
CREATE INDEX IF NOT EXISTS viewport_business_leads_score_idx ON viewport_business_leads(score DESC);
CREATE INDEX IF NOT EXISTS viewport_business_leads_updated_idx ON viewport_business_leads(updated_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_leads_contact_status_idx ON viewport_business_leads(contact_status);
CREATE INDEX IF NOT EXISTS viewport_business_leads_site_quality_idx ON viewport_business_leads(site_quality);

-- Business operations suite: multiple contacts, timeline, tasks, proposals,
-- accounting records, Gmail/SMS history, website inquiries, audits, and searches.
CREATE TABLE IF NOT EXISTS viewport_business_contacts (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  confidence INTEGER NOT NULL DEFAULT 50,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, kind, value)
);
CREATE TABLE IF NOT EXISTS viewport_business_activities (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_business_tasks (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal',
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_business_proposals (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'EUR',
  setup_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  delivery_days INTEGER NOT NULL DEFAULT 14,
  revisions INTEGER NOT NULL DEFAULT 2,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_business_transactions (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'invoice',
  status TEXT NOT NULL DEFAULT 'unpaid',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  due_at DATE,
  paid_at TIMESTAMPTZ,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_business_messages (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  sender TEXT NOT NULL DEFAULT '',
  recipient TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  external_id TEXT NOT NULL DEFAULT '',
  thread_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  unread BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_business_inquiries (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  source_site TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_business_audits (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'mobile',
  score INTEGER NOT NULL DEFAULT 0,
  performance INTEGER,
  accessibility INTEGER,
  seo INTEGER,
  best_practices INTEGER,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  screenshot TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_business_search_runs (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  bounds JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'running',
  found_count INTEGER NOT NULL DEFAULT 0,
  scanned_count INTEGER NOT NULL DEFAULT 0,
  api_requests INTEGER NOT NULL DEFAULT 0,
  cursor JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_gmail_connection (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  email TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL DEFAULT '',
  refresh_token TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  scope TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS viewport_business_contacts_lead_idx ON viewport_business_contacts(lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_activities_lead_idx ON viewport_business_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_tasks_due_idx ON viewport_business_tasks(done, due_at);
CREATE INDEX IF NOT EXISTS viewport_business_proposals_lead_idx ON viewport_business_proposals(lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_transactions_status_idx ON viewport_business_transactions(status, due_at);
CREATE UNIQUE INDEX IF NOT EXISTS viewport_business_messages_external_unique ON viewport_business_messages(channel, external_id) WHERE external_id <> '';
CREATE INDEX IF NOT EXISTS viewport_business_messages_thread_idx ON viewport_business_messages(channel, thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_messages_lead_idx ON viewport_business_messages(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_inquiries_status_idx ON viewport_business_inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_audits_lead_idx ON viewport_business_audits(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS viewport_business_search_runs_created_idx ON viewport_business_search_runs(created_at DESC);

-- V8 client website operations and no-login support channel
CREATE TABLE IF NOT EXISTS viewport_client_sites (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  production_url TEXT NOT NULL DEFAULT '',
  preview_url TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  repository_url TEXT NOT NULL DEFAULT '',
  lifecycle_status TEXT NOT NULL DEFAULT 'planning',
  availability_status TEXT NOT NULL DEFAULT 'unknown',
  maintenance_plan TEXT NOT NULL DEFAULT 'handoff',
  domain_owner TEXT NOT NULL DEFAULT 'client',
  hosting_owner TEXT NOT NULL DEFAULT 'client',
  database_owner TEXT NOT NULL DEFAULT 'not_required',
  source_owner TEXT NOT NULL DEFAULT 'client_after_final_payment',
  primary_contact TEXT NOT NULL DEFAULT '',
  support_token TEXT NOT NULL UNIQUE,
  launched_at TIMESTAMPTZ,
  maintenance_until TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  last_http_status INTEGER,
  last_response_ms INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_client_requests (
  id BIGSERIAL PRIMARY KEY,
  client_site_id BIGINT NOT NULL REFERENCES viewport_client_sites(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'change',
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  channel TEXT NOT NULL DEFAULT 'support_form',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS viewport_client_events (
  id BIGSERIAL PRIMARY KEY,
  client_site_id BIGINT NOT NULL REFERENCES viewport_client_sites(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS viewport_client_sites_status_idx ON viewport_client_sites(lifecycle_status, availability_status);
CREATE INDEX IF NOT EXISTS viewport_client_requests_site_idx ON viewport_client_requests(client_site_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS viewport_client_events_site_idx ON viewport_client_events(client_site_id, created_at DESC);
