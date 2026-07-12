import "server-only";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { safeFetchText } from "@/lib/safeFetch";
import { listLeads } from "@/lib/localStore";

type Sql = ReturnType<typeof neon>;
let cached: Sql | null | undefined;
let ready = false;

function sql() {
  if (cached !== undefined) return cached;
  cached = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  return cached;
}

function dbRequired() {
  const db = sql();
  if (!db) throw new Error("DATABASE_URL is not set");
  return db;
}

function clean(value: unknown, max = 4000) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function enumValue(value: unknown, allowed: readonly string[], fallback: string) {
  const candidate = clean(value, 80).toLowerCase();
  return allowed.includes(candidate) ? candidate : fallback;
}

const lifecycleValues = ["planning", "building", "review", "live", "maintenance", "paused", "handed_off"] as const;
const availabilityValues = ["unknown", "online", "degraded", "offline", "maintenance"] as const;
const requestStatuses = ["new", "planned", "in_progress", "waiting_client", "done", "declined"] as const;
const requestPriorities = ["low", "normal", "high", "urgent"] as const;

export async function ensureClientSiteSchema() {
  if (ready) return;
  const db = dbRequired();
  await db`CREATE TABLE IF NOT EXISTS viewport_client_sites (
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
  )`;
  await db`CREATE TABLE IF NOT EXISTS viewport_client_requests (
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
  )`;
  await db`CREATE TABLE IF NOT EXISTS viewport_client_events (
    id BIGSERIAL PRIMARY KEY,
    client_site_id BIGINT NOT NULL REFERENCES viewport_client_sites(id) ON DELETE CASCADE,
    lead_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`CREATE INDEX IF NOT EXISTS viewport_client_sites_status_idx ON viewport_client_sites(lifecycle_status, availability_status)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_client_requests_site_idx ON viewport_client_requests(client_site_id, status, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_client_events_site_idx ON viewport_client_events(client_site_id, created_at DESC)`;
  ready = true;
}

function mapSite(row: any) {
  return {
    id: Number(row.id), leadId: row.lead_id, projectName: row.project_name,
    productionUrl: row.production_url, previewUrl: row.preview_url, domain: row.domain,
    repositoryUrl: row.repository_url, lifecycleStatus: row.lifecycle_status,
    availabilityStatus: row.availability_status, maintenancePlan: row.maintenance_plan,
    domainOwner: row.domain_owner, hostingOwner: row.hosting_owner,
    databaseOwner: row.database_owner, sourceOwner: row.source_owner,
    primaryContact: row.primary_contact, supportToken: row.support_token,
    launchedAt: row.launched_at || "", maintenanceUntil: row.maintenance_until || "",
    lastCheckedAt: row.last_checked_at || "", lastHttpStatus: row.last_http_status == null ? null : Number(row.last_http_status),
    lastResponseMs: row.last_response_ms == null ? null : Number(row.last_response_ms),
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapRequest(row: any) {
  return {
    id: Number(row.id), clientSiteId: Number(row.client_site_id), leadId: row.lead_id,
    requestType: row.request_type, status: row.status, priority: row.priority, channel: row.channel,
    customerName: row.customer_name, customerEmail: row.customer_email, subject: row.subject,
    body: row.body, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapEvent(row: any) {
  return {
    id: Number(row.id), clientSiteId: Number(row.client_site_id), leadId: row.lead_id,
    kind: row.kind, summary: row.summary, metadata: row.metadata || {}, createdAt: row.created_at,
  };
}

export async function listClientWorkspace() {
  await ensureClientSiteSchema();
  const db = dbRequired();
  const [sites, requests, events, leads] = await Promise.all([
    db`SELECT *, launched_at::text, maintenance_until::text, last_checked_at::text, created_at::text, updated_at::text FROM viewport_client_sites ORDER BY updated_at DESC`,
    db`SELECT *, created_at::text, updated_at::text FROM viewport_client_requests ORDER BY created_at DESC LIMIT 1000`,
    db`SELECT *, created_at::text FROM viewport_client_events ORDER BY created_at DESC LIMIT 1500`,
    listLeads(),
  ]);
  return { sites: (sites as any[]).map(mapSite), requests: (requests as any[]).map(mapRequest), events: (events as any[]).map(mapEvent), leads };
}

function token() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function saveClientSite(input: Record<string, unknown>) {
  await ensureClientSiteSchema();
  const db = dbRequired();
  const leadId = clean(input.leadId, 300);
  const projectName = clean(input.projectName, 240);
  if (!leadId || !projectName) throw new Error("Company and project name are required");
  const lifecycle = enumValue(input.lifecycleStatus, lifecycleValues, "planning");
  const availability = enumValue(input.availabilityStatus, availabilityValues, "unknown");
  const launchedAt = clean(input.launchedAt, 40) || null;
  const maintenanceUntil = clean(input.maintenanceUntil, 40) || null;
  const rows = await db`INSERT INTO viewport_client_sites(
    lead_id, project_name, production_url, preview_url, domain, repository_url,
    lifecycle_status, availability_status, maintenance_plan, domain_owner, hosting_owner,
    database_owner, source_owner, primary_contact, support_token, launched_at, maintenance_until, notes
  ) VALUES(
    ${leadId}, ${projectName}, ${clean(input.productionUrl, 1000)}, ${clean(input.previewUrl, 1000)},
    ${clean(input.domain, 300)}, ${clean(input.repositoryUrl, 1000)}, ${lifecycle}, ${availability},
    ${clean(input.maintenancePlan, 120) || "handoff"}, ${clean(input.domainOwner, 200) || "client"},
    ${clean(input.hostingOwner, 200) || "client"}, ${clean(input.databaseOwner, 200) || "not_required"},
    ${clean(input.sourceOwner, 240) || "client_after_final_payment"}, ${clean(input.primaryContact, 500)},
    ${token()}, ${launchedAt}, ${maintenanceUntil}, ${clean(input.notes, 12000)}
  ) ON CONFLICT(lead_id) DO UPDATE SET
    project_name=EXCLUDED.project_name, production_url=EXCLUDED.production_url, preview_url=EXCLUDED.preview_url,
    domain=EXCLUDED.domain, repository_url=EXCLUDED.repository_url, lifecycle_status=EXCLUDED.lifecycle_status,
    availability_status=EXCLUDED.availability_status, maintenance_plan=EXCLUDED.maintenance_plan,
    domain_owner=EXCLUDED.domain_owner, hosting_owner=EXCLUDED.hosting_owner, database_owner=EXCLUDED.database_owner,
    source_owner=EXCLUDED.source_owner, primary_contact=EXCLUDED.primary_contact,
    launched_at=EXCLUDED.launched_at, maintenance_until=EXCLUDED.maintenance_until, notes=EXCLUDED.notes, updated_at=NOW()
  RETURNING *, launched_at::text, maintenance_until::text, last_checked_at::text, created_at::text, updated_at::text`;
  const site = mapSite((rows as any[])[0]);
  await db`INSERT INTO viewport_client_events(client_site_id, lead_id, kind, summary, metadata)
    VALUES(${site.id}, ${leadId}, 'project_saved', ${`Project record updated: ${projectName}`}, ${JSON.stringify({ lifecycle, availability })}::jsonb)`;
  return site;
}

export async function rotateClientSupportToken(id: number) {
  await ensureClientSiteSchema();
  const db = dbRequired();
  const rows = await db`UPDATE viewport_client_sites SET support_token=${token()}, updated_at=NOW() WHERE id=${id} RETURNING support_token`;
  if (!(rows as any[]).length) throw new Error("Client project not found");
  return { supportToken: (rows as any[])[0].support_token };
}

export async function addClientRequestByToken(input: Record<string, unknown>) {
  await ensureClientSiteSchema();
  const db = dbRequired();
  const supportToken = clean(input.token, 200);
  const email = clean(input.email, 320).toLowerCase();
  const subject = clean(input.subject, 300);
  const body = clean(input.message, 12000);
  if (!supportToken || !email || !/^\S+@\S+\.\S+$/.test(email) || !subject || body.length < 5) throw new Error("Enter a valid project code, email, subject and message");
  const sites = await db`SELECT id, lead_id, project_name FROM viewport_client_sites WHERE support_token=${supportToken} LIMIT 1`;
  if (!(sites as any[]).length) throw new Error("Project code was not recognised");
  const site = (sites as any[])[0];
  const requestType = enumValue(input.type, ["change", "fault", "feature", "billing", "note"], "change");
  const priority = enumValue(input.priority, requestPriorities, "normal");
  const rows = await db`INSERT INTO viewport_client_requests(
      client_site_id, lead_id, request_type, status, priority, channel, customer_name, customer_email, subject, body
    ) VALUES(${Number(site.id)}, ${site.lead_id}, ${requestType}, 'new', ${priority}, 'support_form',
      ${clean(input.name, 200)}, ${email}, ${subject}, ${body})
    RETURNING *, created_at::text, updated_at::text`;
  const request = mapRequest((rows as any[])[0]);
  await db`INSERT INTO viewport_client_events(client_site_id, lead_id, kind, summary, metadata)
    VALUES(${request.clientSiteId}, ${request.leadId}, 'client_request', ${`${priority.toUpperCase()} ${requestType}: ${subject}`}, ${JSON.stringify({ requestId: request.id, email })}::jsonb)`;
  return { request, projectName: site.project_name };
}

export async function updateClientRequest(id: number, statusInput: unknown) {
  await ensureClientSiteSchema();
  const db = dbRequired();
  const status = enumValue(statusInput, requestStatuses, "new");
  const rows = await db`UPDATE viewport_client_requests SET status=${status}, updated_at=NOW() WHERE id=${id} RETURNING *, created_at::text, updated_at::text`;
  if (!(rows as any[]).length) throw new Error("Request not found");
  const request = mapRequest((rows as any[])[0]);
  await db`INSERT INTO viewport_client_events(client_site_id, lead_id, kind, summary, metadata)
    VALUES(${request.clientSiteId}, ${request.leadId}, 'request_status', ${`Request #${request.id} marked ${status}`}, ${JSON.stringify({ requestId: request.id, status })}::jsonb)`;
  return request;
}

export async function addClientEvent(input: Record<string, unknown>) {
  await ensureClientSiteSchema();
  const db = dbRequired();
  const clientSiteId = Number(input.clientSiteId || 0);
  const leadId = clean(input.leadId, 300);
  const summary = clean(input.summary, 5000);
  if (!clientSiteId || !leadId || !summary) throw new Error("Project and note are required");
  const rows = await db`INSERT INTO viewport_client_events(client_site_id, lead_id, kind, summary, metadata)
    VALUES(${clientSiteId}, ${leadId}, ${clean(input.kind, 80) || "note"}, ${summary}, ${JSON.stringify(input.metadata && typeof input.metadata === "object" ? input.metadata : {})}::jsonb)
    RETURNING *, created_at::text`;
  return mapEvent((rows as any[])[0]);
}

export async function checkClientSite(id: number) {
  await ensureClientSiteSchema();
  const db = dbRequired();
  const rows = await db`SELECT id, lead_id, production_url, lifecycle_status FROM viewport_client_sites WHERE id=${id} LIMIT 1`;
  if (!(rows as any[]).length) throw new Error("Client project not found");
  const site = (rows as any[])[0];
  if (!site.production_url) throw new Error("Production URL is empty");
  if (site.lifecycle_status === "maintenance") {
    const updated = await db`UPDATE viewport_client_sites SET availability_status='maintenance', last_checked_at=NOW(), updated_at=NOW() WHERE id=${id} RETURNING *, launched_at::text, maintenance_until::text, last_checked_at::text, created_at::text, updated_at::text`;
    return mapSite((updated as any[])[0]);
  }
  const started = Date.now();
  let status = 0;
  let availability = "offline";
  try {
    const result = await safeFetchText(site.production_url, { timeoutMs: 12000, maxBytes: 350000 });
    status = result.response.status;
    availability = status >= 200 && status < 400 ? "online" : status < 500 ? "degraded" : "offline";
  } catch {
    status = 0;
    availability = "offline";
  }
  const responseMs = Date.now() - started;
  const updated = await db`UPDATE viewport_client_sites SET availability_status=${availability}, last_checked_at=NOW(), last_http_status=${status || null}, last_response_ms=${responseMs}, updated_at=NOW() WHERE id=${id} RETURNING *, launched_at::text, maintenance_until::text, last_checked_at::text, created_at::text, updated_at::text`;
  await db`INSERT INTO viewport_client_events(client_site_id, lead_id, kind, summary, metadata)
    VALUES(${id}, ${site.lead_id}, 'availability_check', ${`Website check: ${availability}${status ? ` (HTTP ${status})` : ""}`}, ${JSON.stringify({ status, responseMs })}::jsonb)`;
  return mapSite((updated as any[])[0]);
}
