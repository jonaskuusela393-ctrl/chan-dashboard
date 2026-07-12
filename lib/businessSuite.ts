import "server-only";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

export type SuiteContact = {
  id: number;
  leadId: string;
  kind: string;
  value: string;
  label: string;
  sourceUrl: string;
  confidence: number;
  verified: boolean;
  primary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SuiteActivity = {
  id: number;
  leadId: string;
  kind: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type SuiteTask = {
  id: number;
  leadId: string;
  title: string;
  dueAt: string;
  priority: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SuiteProposal = {
  id: number;
  leadId: string;
  title: string;
  status: string;
  currency: string;
  setupAmount: number;
  monthlyAmount: number;
  depositAmount: number;
  validUntil: string;
  deliveryDays: number;
  revisions: number;
  lineItems: Array<{ label: string; amount: number; recurring?: boolean }>;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SuiteTransaction = {
  id: number;
  leadId: string;
  kind: string;
  status: string;
  amount: number;
  currency: string;
  dueAt: string;
  paidAt: string;
  description: string;
  createdAt: string;
};

export type SuiteMessage = {
  id: number;
  leadId: string;
  channel: string;
  direction: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  externalId: string;
  threadId: string;
  status: string;
  unread: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SuiteInquiry = {
  id: number;
  leadId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  sourceSite: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type SuiteAudit = {
  id: number;
  leadId: string;
  url: string;
  strategy: string;
  score: number;
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
  issues: Array<{ severity: string; label: string; detail?: string }>;
  facts: Record<string, unknown>;
  screenshot: string;
  createdAt: string;
};

export type SuiteSearchRun = {
  id: number;
  query: string;
  location: string;
  bounds: Record<string, unknown>;
  status: string;
  foundCount: number;
  scannedCount: number;
  apiRequests: number;
  cursor: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GmailConnection = {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
};

type Sql = ReturnType<typeof neon>;
let cached: Sql | null | undefined;
let ready = false;

function sql() {
  if (cached !== undefined) return cached;
  cached = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  return cached;
}

function requiredDb() {
  const db = sql();
  if (!db) throw new Error("DATABASE_URL is not set");
  return db;
}

function clean(value: unknown, max = 4000) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, max);
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function decimal(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function json(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function secretKey() {
  const raw = process.env.AUTH_SECRET || "";
  if (raw.length < 32) throw new Error("AUTH_SECRET must be set before storing OAuth tokens");
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(value: string) {
  if (!value) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  if (!value) return "";
  if (!value.startsWith("v1.")) return value;
  const [, ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) return "";
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8");
}

export async function ensureBusinessSuiteSchema() {
  if (ready) return;
  const db = requiredDb();

  await db`CREATE TABLE IF NOT EXISTS viewport_business_contacts (
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
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_activities (
    id BIGSERIAL PRIMARY KEY,
    lead_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_tasks (
    id BIGSERIAL PRIMARY KEY,
    lead_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    due_at TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'normal',
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_proposals (
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
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_transactions (
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
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_messages (
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
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_inquiries (
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
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_audits (
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
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_search_runs (
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
  )`;

  await db`CREATE TABLE IF NOT EXISTS viewport_gmail_connection (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    email TEXT NOT NULL DEFAULT '',
    access_token TEXT NOT NULL DEFAULT '',
    refresh_token TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ,
    scope TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await db`CREATE INDEX IF NOT EXISTS viewport_business_contacts_lead_idx ON viewport_business_contacts(lead_id, updated_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_activities_lead_idx ON viewport_business_activities(lead_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_tasks_due_idx ON viewport_business_tasks(done, due_at)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_proposals_lead_idx ON viewport_business_proposals(lead_id, updated_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_transactions_status_idx ON viewport_business_transactions(status, due_at)`;
  await db`CREATE UNIQUE INDEX IF NOT EXISTS viewport_business_messages_external_unique ON viewport_business_messages(channel, external_id) WHERE external_id <> ''`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_messages_thread_idx ON viewport_business_messages(channel, thread_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_messages_lead_idx ON viewport_business_messages(lead_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_inquiries_status_idx ON viewport_business_inquiries(status, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_audits_lead_idx ON viewport_business_audits(lead_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_search_runs_created_idx ON viewport_business_search_runs(created_at DESC)`;

  ready = true;
}

export async function getBusinessWorkspace(leadId = "") {
  const db = requiredDb();
  await ensureBusinessSuiteSchema();
  const target = clean(leadId, 300);

  const contacts = target
    ? await db`SELECT id, lead_id, kind, value, label, source_url, confidence, verified, is_primary, created_at::text, updated_at::text FROM viewport_business_contacts WHERE lead_id=${target} ORDER BY is_primary DESC, confidence DESC, updated_at DESC`
    : await db`SELECT id, lead_id, kind, value, label, source_url, confidence, verified, is_primary, created_at::text, updated_at::text FROM viewport_business_contacts ORDER BY updated_at DESC LIMIT 1000`;
  const activities = target
    ? await db`SELECT id, lead_id, kind, summary, metadata, created_at::text FROM viewport_business_activities WHERE lead_id=${target} ORDER BY created_at DESC LIMIT 300`
    : await db`SELECT id, lead_id, kind, summary, metadata, created_at::text FROM viewport_business_activities ORDER BY created_at DESC LIMIT 500`;
  const tasks = await db`SELECT id, lead_id, title, COALESCE(due_at::text, '') AS due_at, priority, done, created_at::text, updated_at::text FROM viewport_business_tasks ORDER BY done ASC, due_at NULLS LAST, created_at DESC LIMIT 500`;
  const proposals = target
    ? await db`SELECT id, lead_id, title, status, currency, setup_amount::float8, monthly_amount::float8, deposit_amount::float8, COALESCE(valid_until::text, '') AS valid_until, delivery_days, revisions, line_items, notes, created_at::text, updated_at::text FROM viewport_business_proposals WHERE lead_id=${target} ORDER BY updated_at DESC`
    : await db`SELECT id, lead_id, title, status, currency, setup_amount::float8, monthly_amount::float8, deposit_amount::float8, COALESCE(valid_until::text, '') AS valid_until, delivery_days, revisions, line_items, notes, created_at::text, updated_at::text FROM viewport_business_proposals ORDER BY updated_at DESC LIMIT 500`;
  const transactions = await db`SELECT id, lead_id, kind, status, amount::float8, currency, COALESCE(due_at::text, '') AS due_at, COALESCE(paid_at::text, '') AS paid_at, description, created_at::text FROM viewport_business_transactions ORDER BY created_at DESC LIMIT 1000`;
  const messages = target
    ? await db`SELECT id, lead_id, channel, direction, sender, recipient, subject, body, external_id, thread_id, status, unread, metadata, created_at::text, updated_at::text FROM viewport_business_messages WHERE lead_id=${target} ORDER BY created_at DESC LIMIT 500`
    : await db`SELECT id, lead_id, channel, direction, sender, recipient, subject, body, external_id, thread_id, status, unread, metadata, created_at::text, updated_at::text FROM viewport_business_messages ORDER BY created_at DESC LIMIT 1000`;
  const inquiries = target
    ? await db`SELECT id, lead_id, name, email, phone, message, source_site, status, created_at::text, updated_at::text FROM viewport_business_inquiries WHERE lead_id=${target} ORDER BY created_at DESC`
    : await db`SELECT id, lead_id, name, email, phone, message, source_site, status, created_at::text, updated_at::text FROM viewport_business_inquiries ORDER BY created_at DESC LIMIT 1000`;
  const audits = target
    ? await db`SELECT id, lead_id, url, strategy, score, performance, accessibility, seo, best_practices, issues, facts, screenshot, created_at::text FROM viewport_business_audits WHERE lead_id=${target} ORDER BY created_at DESC LIMIT 50`
    : await db`SELECT id, lead_id, url, strategy, score, performance, accessibility, seo, best_practices, issues, facts, screenshot, created_at::text FROM viewport_business_audits ORDER BY created_at DESC LIMIT 300`;
  const searchRuns = await db`SELECT id, query, location, bounds, status, found_count, scanned_count, api_requests, cursor, created_at::text, updated_at::text FROM viewport_business_search_runs ORDER BY created_at DESC LIMIT 100`;

  const resultRows = (value: unknown) => value as any[];
  return {
    contacts: resultRows(contacts).map((row: any) => ({ id: Number(row.id), leadId: row.lead_id, kind: row.kind, value: row.value, label: row.label, sourceUrl: row.source_url, confidence: Number(row.confidence), verified: Boolean(row.verified), primary: Boolean(row.is_primary), createdAt: row.created_at, updatedAt: row.updated_at })),
    activities: resultRows(activities).map((row: any) => ({ id: Number(row.id), leadId: row.lead_id, kind: row.kind, summary: row.summary, metadata: row.metadata || {}, createdAt: row.created_at })),
    tasks: resultRows(tasks).map((row: any) => ({ id: Number(row.id), leadId: row.lead_id, title: row.title, dueAt: row.due_at, priority: row.priority, done: Boolean(row.done), createdAt: row.created_at, updatedAt: row.updated_at })),
    proposals: resultRows(proposals).map((row: any) => ({ id: Number(row.id), leadId: row.lead_id, title: row.title, status: row.status, currency: row.currency, setupAmount: Number(row.setup_amount), monthlyAmount: Number(row.monthly_amount), depositAmount: Number(row.deposit_amount), validUntil: row.valid_until, deliveryDays: Number(row.delivery_days), revisions: Number(row.revisions), lineItems: Array.isArray(row.line_items) ? row.line_items : [], notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at })),
    transactions: resultRows(transactions).map((row: any) => ({ id: Number(row.id), leadId: row.lead_id, kind: row.kind, status: row.status, amount: Number(row.amount), currency: row.currency, dueAt: row.due_at, paidAt: row.paid_at, description: row.description, createdAt: row.created_at })),
    messages: resultRows(messages).map((row: any) => ({ id: Number(row.id), leadId: row.lead_id, channel: row.channel, direction: row.direction, sender: row.sender, recipient: row.recipient, subject: row.subject, body: row.body, externalId: row.external_id, threadId: row.thread_id, status: row.status, unread: Boolean(row.unread), metadata: row.metadata || {}, createdAt: row.created_at, updatedAt: row.updated_at })),
    inquiries: resultRows(inquiries).map((row: any) => ({ id: Number(row.id), leadId: row.lead_id, name: row.name, email: row.email, phone: row.phone, message: row.message, sourceSite: row.source_site, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at })),
    audits: resultRows(audits).map((row: any) => ({ id: Number(row.id), leadId: row.lead_id, url: row.url, strategy: row.strategy, score: Number(row.score), performance: row.performance == null ? null : Number(row.performance), accessibility: row.accessibility == null ? null : Number(row.accessibility), seo: row.seo == null ? null : Number(row.seo), bestPractices: row.best_practices == null ? null : Number(row.best_practices), issues: Array.isArray(row.issues) ? row.issues : [], facts: row.facts || {}, screenshot: row.screenshot || "", createdAt: row.created_at })),
    searchRuns: resultRows(searchRuns).map((row: any) => ({ id: Number(row.id), query: row.query, location: row.location, bounds: row.bounds || {}, status: row.status, foundCount: Number(row.found_count), scannedCount: Number(row.scanned_count), apiRequests: Number(row.api_requests), cursor: row.cursor || {}, createdAt: row.created_at, updatedAt: row.updated_at })),
  };
}

export async function runBusinessAction(action: string, input: Record<string, unknown>) {
  const db = requiredDb();
  await ensureBusinessSuiteSchema();
  const leadId = clean(input.leadId, 300);

  switch (action) {
    case "contact.upsert": {
      const kind = clean(input.kind || "other", 40).toLowerCase();
      const value = clean(input.value, 1000).trim();
      if (!leadId || !value) throw new Error("leadId and contact value are required");
      const rows = await db`INSERT INTO viewport_business_contacts(lead_id, kind, value, label, source_url, confidence, verified, is_primary)
        VALUES(${leadId}, ${kind}, ${value}, ${clean(input.label, 200)}, ${clean(input.sourceUrl, 1200)}, ${Math.max(0, Math.min(integer(input.confidence, 70), 100))}, ${bool(input.verified)}, ${bool(input.primary)})
        ON CONFLICT(lead_id, kind, value) DO UPDATE SET label=EXCLUDED.label, source_url=EXCLUDED.source_url, confidence=EXCLUDED.confidence, verified=EXCLUDED.verified, is_primary=EXCLUDED.is_primary, updated_at=NOW()
        RETURNING id`;
      await db`INSERT INTO viewport_business_activities(lead_id, kind, summary, metadata) VALUES(${leadId}, 'contact', ${`Saved ${kind}: ${value}`}, ${JSON.stringify({ kind, value })}::jsonb)`;
      return { id: Number((rows as any[])[0]?.id || 0) };
    }
    case "contacts.import": {
      if (!leadId) throw new Error("leadId is required");
      const contacts = list(input.contacts).slice(0, 100);
      let inserted = 0;
      for (const item of contacts) {
        const kind = clean(item.kind || "other", 40).toLowerCase();
        const value = clean(item.value, 1000).trim();
        if (!value) continue;
        await db`INSERT INTO viewport_business_contacts(lead_id, kind, value, label, source_url, confidence, verified, is_primary)
          VALUES(${leadId}, ${kind}, ${value}, ${clean(item.label, 200)}, ${clean(item.sourceUrl, 1200)}, ${Math.max(0, Math.min(integer(item.confidence, 60), 100))}, ${bool(item.verified)}, ${bool(item.primary)})
          ON CONFLICT(lead_id, kind, value) DO UPDATE SET source_url=COALESCE(NULLIF(EXCLUDED.source_url, ''), viewport_business_contacts.source_url), confidence=GREATEST(viewport_business_contacts.confidence, EXCLUDED.confidence), updated_at=NOW()`;
        inserted += 1;
      }
      if (inserted) await db`INSERT INTO viewport_business_activities(lead_id, kind, summary, metadata) VALUES(${leadId}, 'scan', ${`Imported ${inserted} discovered contacts`}, ${JSON.stringify({ inserted })}::jsonb)`;
      return { inserted };
    }
    case "activity.add": {
      const summary = clean(input.summary, 5000).trim();
      if (!summary) throw new Error("activity summary is required");
      const rows = await db`INSERT INTO viewport_business_activities(lead_id, kind, summary, metadata) VALUES(${leadId}, ${clean(input.kind || "note", 80)}, ${summary}, ${JSON.stringify(json(input.metadata))}::jsonb) RETURNING id`;
      return { id: Number((rows as any[])[0]?.id || 0) };
    }
    case "task.save": {
      const id = integer(input.id);
      const title = clean(input.title, 1000).trim();
      if (!title) throw new Error("task title is required");
      if (id) {
        await db`UPDATE viewport_business_tasks SET lead_id=${leadId}, title=${title}, due_at=${clean(input.dueAt, 80) || null}, priority=${clean(input.priority || "normal", 30)}, done=${bool(input.done)}, updated_at=NOW() WHERE id=${id}`;
        return { id };
      }
      const rows = await db`INSERT INTO viewport_business_tasks(lead_id, title, due_at, priority, done) VALUES(${leadId}, ${title}, ${clean(input.dueAt, 80) || null}, ${clean(input.priority || "normal", 30)}, ${bool(input.done)}) RETURNING id`;
      return { id: Number((rows as any[])[0]?.id || 0) };
    }
    case "proposal.save": {
      const id = integer(input.id);
      const title = clean(input.title || "Website proposal", 500);
      const items = list(input.lineItems).slice(0, 50).map((item) => ({ label: clean(item.label, 300), amount: decimal(item.amount), recurring: bool(item.recurring) }));
      if (!leadId) throw new Error("leadId is required");
      if (id) {
        await db`UPDATE viewport_business_proposals SET title=${title}, status=${clean(input.status || "draft", 40)}, currency=${clean(input.currency || "EUR", 8)}, setup_amount=${decimal(input.setupAmount)}, monthly_amount=${decimal(input.monthlyAmount)}, deposit_amount=${decimal(input.depositAmount)}, valid_until=${clean(input.validUntil, 40) || null}, delivery_days=${Math.max(1, integer(input.deliveryDays, 14))}, revisions=${Math.max(0, integer(input.revisions, 2))}, line_items=${JSON.stringify(items)}::jsonb, notes=${clean(input.notes, 10000)}, updated_at=NOW() WHERE id=${id}`;
        return { id };
      }
      const rows = await db`INSERT INTO viewport_business_proposals(lead_id, title, status, currency, setup_amount, monthly_amount, deposit_amount, valid_until, delivery_days, revisions, line_items, notes)
        VALUES(${leadId}, ${title}, ${clean(input.status || "draft", 40)}, ${clean(input.currency || "EUR", 8)}, ${decimal(input.setupAmount)}, ${decimal(input.monthlyAmount)}, ${decimal(input.depositAmount)}, ${clean(input.validUntil, 40) || null}, ${Math.max(1, integer(input.deliveryDays, 14))}, ${Math.max(0, integer(input.revisions, 2))}, ${JSON.stringify(items)}::jsonb, ${clean(input.notes, 10000)}) RETURNING id`;
      await db`INSERT INTO viewport_business_activities(lead_id, kind, summary, metadata) VALUES(${leadId}, 'proposal', ${`Created proposal: ${title}`}, ${JSON.stringify({ setupAmount: decimal(input.setupAmount), monthlyAmount: decimal(input.monthlyAmount) })}::jsonb)`;
      return { id: Number((rows as any[])[0]?.id || 0) };
    }
    case "transaction.add": {
      const rows = await db`INSERT INTO viewport_business_transactions(lead_id, kind, status, amount, currency, due_at, paid_at, description)
        VALUES(${leadId}, ${clean(input.kind || "invoice", 40)}, ${clean(input.status || "unpaid", 40)}, ${decimal(input.amount)}, ${clean(input.currency || "EUR", 8)}, ${clean(input.dueAt, 40) || null}, ${clean(input.paidAt, 80) || null}, ${clean(input.description, 2000)}) RETURNING id`;
      return { id: Number((rows as any[])[0]?.id || 0) };
    }
    case "message.add": {
      const channel = clean(input.channel || "note", 40);
      const externalId = clean(input.externalId, 1000);
      const rows = externalId
        ? await db`INSERT INTO viewport_business_messages(lead_id, channel, direction, sender, recipient, subject, body, external_id, thread_id, status, unread, metadata)
          VALUES(${leadId}, ${channel}, ${clean(input.direction || "outbound", 20)}, ${clean(input.sender, 500)}, ${clean(input.recipient, 500)}, ${clean(input.subject, 1000)}, ${clean(input.body, 50000)}, ${externalId}, ${clean(input.threadId, 1000)}, ${clean(input.status, 80)}, ${bool(input.unread)}, ${JSON.stringify(json(input.metadata))}::jsonb)
          ON CONFLICT(channel, external_id) WHERE external_id <> '' DO UPDATE SET lead_id=COALESCE(NULLIF(EXCLUDED.lead_id, ''), viewport_business_messages.lead_id), status=COALESCE(NULLIF(EXCLUDED.status, ''), viewport_business_messages.status), unread=EXCLUDED.unread, body=CASE WHEN EXCLUDED.body='' THEN viewport_business_messages.body ELSE EXCLUDED.body END, metadata=viewport_business_messages.metadata || EXCLUDED.metadata, updated_at=NOW() RETURNING id`
        : await db`INSERT INTO viewport_business_messages(lead_id, channel, direction, sender, recipient, subject, body, external_id, thread_id, status, unread, metadata)
          VALUES(${leadId}, ${channel}, ${clean(input.direction || "outbound", 20)}, ${clean(input.sender, 500)}, ${clean(input.recipient, 500)}, ${clean(input.subject, 1000)}, ${clean(input.body, 50000)}, '', ${clean(input.threadId, 1000)}, ${clean(input.status, 80)}, ${bool(input.unread)}, ${JSON.stringify(json(input.metadata))}::jsonb) RETURNING id`;
      return { id: Number((rows as any[])[0]?.id || 0) };
    }
    case "message.read": {
      const id = integer(input.id);
      await db`UPDATE viewport_business_messages SET unread=FALSE, updated_at=NOW() WHERE id=${id}`;
      return { id };
    }
    case "inquiry.add": {
      const rows = await db`INSERT INTO viewport_business_inquiries(lead_id, name, email, phone, message, source_site, status)
        VALUES(${leadId}, ${clean(input.name, 300)}, ${clean(input.email, 500)}, ${clean(input.phone, 100)}, ${clean(input.message, 20000)}, ${clean(input.sourceSite, 1200)}, ${clean(input.status || "new", 40)}) RETURNING id`;
      const id = Number((rows as any[])[0]?.id || 0);
      await db`INSERT INTO viewport_business_messages(lead_id, channel, direction, sender, recipient, subject, body, external_id, thread_id, status, unread, metadata)
        VALUES(${leadId}, 'inquiry', 'inbound', ${clean(input.email || input.phone || input.name, 500)}, '', 'Website inquiry', ${clean(input.message, 20000)}, ${String(id)}, ${`inquiry-${id}`}, 'received', TRUE, ${JSON.stringify({ name: clean(input.name, 300), phone: clean(input.phone, 100), sourceSite: clean(input.sourceSite, 1200) })}::jsonb)`;
      return { id };
    }
    case "inquiry.status": {
      const id = integer(input.id);
      await db`UPDATE viewport_business_inquiries SET status=${clean(input.status || "read", 40)}, updated_at=NOW() WHERE id=${id}`;
      return { id };
    }
    case "audit.save": {
      const issues = list(input.issues).slice(0, 200);
      const rows = await db`INSERT INTO viewport_business_audits(lead_id, url, strategy, score, performance, accessibility, seo, best_practices, issues, facts, screenshot)
        VALUES(${leadId}, ${clean(input.url, 1200)}, ${clean(input.strategy || "mobile", 20)}, ${integer(input.score)}, ${input.performance == null ? null : integer(input.performance)}, ${input.accessibility == null ? null : integer(input.accessibility)}, ${input.seo == null ? null : integer(input.seo)}, ${input.bestPractices == null ? null : integer(input.bestPractices)}, ${JSON.stringify(issues)}::jsonb, ${JSON.stringify(json(input.facts))}::jsonb, ${clean(input.screenshot, 300000)}) RETURNING id`;
      return { id: Number((rows as any[])[0]?.id || 0) };
    }
    case "search.save": {
      const id = integer(input.id);
      if (id) {
        await db`UPDATE viewport_business_search_runs SET status=${clean(input.status || "complete", 40)}, found_count=${integer(input.foundCount)}, scanned_count=${integer(input.scannedCount)}, api_requests=${integer(input.apiRequests)}, cursor=${JSON.stringify(json(input.cursor))}::jsonb, updated_at=NOW() WHERE id=${id}`;
        return { id };
      }
      const rows = await db`INSERT INTO viewport_business_search_runs(query, location, bounds, status, found_count, scanned_count, api_requests, cursor)
        VALUES(${clean(input.query, 300)}, ${clean(input.location, 500)}, ${JSON.stringify(json(input.bounds))}::jsonb, ${clean(input.status || "complete", 40)}, ${integer(input.foundCount)}, ${integer(input.scannedCount)}, ${integer(input.apiRequests)}, ${JSON.stringify(json(input.cursor))}::jsonb) RETURNING id`;
      return { id: Number((rows as any[])[0]?.id || 0) };
    }
    default:
      throw new Error(`Unknown business action: ${action}`);
  }
}

export async function deleteBusinessEntity(entity: string, id: number) {
  const db = requiredDb();
  await ensureBusinessSuiteSchema();
  if (!id) throw new Error("id is required");
  switch (entity) {
    case "contact": await db`DELETE FROM viewport_business_contacts WHERE id=${id}`; break;
    case "activity": await db`DELETE FROM viewport_business_activities WHERE id=${id}`; break;
    case "task": await db`DELETE FROM viewport_business_tasks WHERE id=${id}`; break;
    case "proposal": await db`DELETE FROM viewport_business_proposals WHERE id=${id}`; break;
    case "transaction": await db`DELETE FROM viewport_business_transactions WHERE id=${id}`; break;
    case "message": await db`DELETE FROM viewport_business_messages WHERE id=${id}`; break;
    case "inquiry": await db`DELETE FROM viewport_business_inquiries WHERE id=${id}`; break;
    case "audit": await db`DELETE FROM viewport_business_audits WHERE id=${id}`; break;
    case "search": await db`DELETE FROM viewport_business_search_runs WHERE id=${id}`; break;
    default: throw new Error("unknown entity");
  }
  return true;
}

export async function saveGmailConnection(input: GmailConnection) {
  const db = requiredDb();
  await ensureBusinessSuiteSchema();
  const existing = await getGmailConnection().catch(() => null);
  await db`INSERT INTO viewport_gmail_connection(id, email, access_token, refresh_token, expires_at, scope)
    VALUES('primary', ${clean(input.email, 500)}, ${encrypt(input.accessToken)}, ${encrypt(input.refreshToken || existing?.refreshToken || "")}, ${input.expiresAt || null}, ${clean(input.scope, 3000)})
    ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email, access_token=EXCLUDED.access_token, refresh_token=CASE WHEN EXCLUDED.refresh_token='' THEN viewport_gmail_connection.refresh_token ELSE EXCLUDED.refresh_token END, expires_at=EXCLUDED.expires_at, scope=EXCLUDED.scope, updated_at=NOW()`;
}

export async function getGmailConnection(): Promise<GmailConnection | null> {
  const db = requiredDb();
  await ensureBusinessSuiteSchema();
  const rows = await db`SELECT email, access_token, refresh_token, COALESCE(expires_at::text, '') AS expires_at, scope FROM viewport_gmail_connection WHERE id='primary' LIMIT 1` as any[];
  const row = rows[0];
  if (!row) return null;
  return { email: row.email || "", accessToken: decrypt(row.access_token || ""), refreshToken: decrypt(row.refresh_token || ""), expiresAt: row.expires_at || "", scope: row.scope || "" };
}

export async function clearGmailConnection() {
  const db = requiredDb();
  await ensureBusinessSuiteSchema();
  await db`DELETE FROM viewport_gmail_connection WHERE id='primary'`;
}

export async function updateExternalMessageStatus(channel: string, externalId: string, status: string, metadata: Record<string, unknown> = {}) {
  const db = requiredDb();
  await ensureBusinessSuiteSchema();
  await db`UPDATE viewport_business_messages SET status=${clean(status, 80)}, metadata=metadata || ${JSON.stringify(metadata)}::jsonb, updated_at=NOW() WHERE channel=${clean(channel, 40)} AND external_id=${clean(externalId, 1000)}`;
}
