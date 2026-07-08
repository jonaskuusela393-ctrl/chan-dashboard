import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

export type LeadStatus = "new" | "saved" | "contacted" | "followup" | "interested" | "won" | "rejected";

export type BusinessLead = {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  mapsUrl: string;
  rating: number | null;
  userRatingCount: number | null;
  lat: number;
  lng: number;
  score: number;
  status: LeadStatus;
  notes: string;
  offerPrice: string;
  packageName: string;
  nextFollowUp: string;
  lastContacted: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

type StoreShape = {
  leads: BusinessLead[];
};

type Sql = ReturnType<typeof neon>;
let cachedSql: Sql | null | undefined;
let businessSchemaReady = false;

function sql() {
  if (cachedSql !== undefined) return cachedSql;
  cachedSql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  return cachedSql;
}

function runtimeCwd() {
  return Function("return process.cwd()")() as string;
}

function dataDir() {
  return path.join(runtimeCwd(), ".dashboard-data");
}

function storePath() {
  return path.join(dataDir(), "business-leads.json");
}

export function cleanText(value: unknown, max = 300) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanUrl(value: unknown, max = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function cleanDateText(value: unknown) {
  return cleanText(value, 40);
}

function allowedStatus(value: unknown): LeadStatus {
  const allowed = new Set<LeadStatus>(["new", "saved", "contacted", "followup", "interested", "won", "rejected"]);
  return allowed.has(value as LeadStatus) ? value as LeadStatus : "saved";
}

function leadDefaults(input: Partial<BusinessLead> & Pick<BusinessLead, "id" | "name">): BusinessLead {
  const now = new Date().toISOString();
  return {
    id: cleanText(input.id, 180),
    name: cleanText(input.name, 180),
    category: cleanText(input.category || "business", 120),
    address: cleanText(input.address, 260),
    phone: cleanText(input.phone, 80),
    email: cleanText(input.email, 180),
    website: cleanUrl(input.website, 500),
    mapsUrl: cleanUrl(input.mapsUrl, 600),
    rating: Number.isFinite(input.rating) ? Number(input.rating) : null,
    userRatingCount: Number.isFinite(input.userRatingCount) ? Number(input.userRatingCount) : null,
    lat: Number.isFinite(input.lat) ? Number(input.lat) : 0,
    lng: Number.isFinite(input.lng) ? Number(input.lng) : 0,
    score: Math.max(0, Math.min(Number(input.score) || 0, 100)),
    status: allowedStatus(input.status),
    notes: cleanText(input.notes, 4000),
    offerPrice: cleanText(input.offerPrice || "300€", 60),
    packageName: cleanText(input.packageName || "Starter Website", 120),
    nextFollowUp: cleanDateText(input.nextFollowUp),
    lastContacted: cleanDateText(input.lastContacted),
    source: cleanText(input.source || "manual", 80),
    createdAt: cleanDateText(input.createdAt) || now,
    updatedAt: cleanDateText(input.updatedAt) || now,
  };
}

async function ensureBusinessSchema() {
  const db = sql();
  if (!db) return false;
  if (businessSchemaReady) return true;

  await db`CREATE TABLE IF NOT EXISTS viewport_business_leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'business',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
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
  )`;

  await db`ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`;
  await db`ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS offer_price TEXT NOT NULL DEFAULT '300€'`;
  await db`ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS package_name TEXT NOT NULL DEFAULT 'Starter Website'`;
  await db`ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS next_follow_up TEXT NOT NULL DEFAULT ''`;
  await db`ALTER TABLE viewport_business_leads ADD COLUMN IF NOT EXISTS last_contacted TEXT NOT NULL DEFAULT ''`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_leads_status_idx ON viewport_business_leads(status)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_leads_followup_idx ON viewport_business_leads(next_follow_up)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_leads_score_idx ON viewport_business_leads(score DESC)`;
  await db`CREATE INDEX IF NOT EXISTS viewport_business_leads_updated_idx ON viewport_business_leads(updated_at DESC)`;

  businessSchemaReady = true;
  return true;
}

function fromDbLead(row: any): BusinessLead {
  return leadDefaults({
    id: row.id,
    name: row.name,
    category: row.category,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    mapsUrl: row.maps_url,
    rating: row.rating,
    userRatingCount: row.user_rating_count,
    lat: row.lat,
    lng: row.lng,
    score: row.score,
    status: row.status,
    notes: row.notes,
    offerPrice: row.offer_price,
    packageName: row.package_name,
    nextFollowUp: row.next_follow_up,
    lastContacted: row.last_contacted,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

async function ensureFileStore(): Promise<StoreShape> {
  await fs.mkdir(dataDir(), { recursive: true });

  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return { leads: Array.isArray(parsed.leads) ? parsed.leads.map((lead: any) => leadDefaults(lead)) : [] };
  } catch {
    const empty: StoreShape = { leads: [] };
    await fs.writeFile(storePath(), JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeFileStore(store: StoreShape) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2));
}

export async function listLeads() {
  const db = sql();
  if (db && await ensureBusinessSchema()) {
    const rows = await db`SELECT id, name, category, address, phone, email, website, maps_url, rating, user_rating_count, lat, lng, score, status, notes, offer_price, package_name, next_follow_up, last_contacted, source, created_at::text, updated_at::text FROM viewport_business_leads ORDER BY updated_at DESC`;
    return (rows as any[]).map(fromDbLead);
  }

  const store = await ensureFileStore();
  return store.leads.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function upsertLead(input: Partial<BusinessLead> & Pick<BusinessLead, "id" | "name">) {
  const now = new Date().toISOString();
  const next = leadDefaults({ ...input, updatedAt: now });
  if (!next.id || !next.name) throw new Error("missing lead id or name");

  const db = sql();
  if (db && await ensureBusinessSchema()) {
    const rows = await db`INSERT INTO viewport_business_leads(
      id, name, category, address, phone, email, website, maps_url, rating, user_rating_count, lat, lng, score, status, notes, offer_price, package_name, next_follow_up, last_contacted, source, created_at, updated_at
    ) VALUES(
      ${next.id}, ${next.name}, ${next.category}, ${next.address}, ${next.phone}, ${next.email}, ${next.website}, ${next.mapsUrl}, ${next.rating}, ${next.userRatingCount}, ${next.lat}, ${next.lng}, ${next.score}, ${next.status}, ${next.notes}, ${next.offerPrice}, ${next.packageName}, ${next.nextFollowUp}, ${next.lastContacted}, ${next.source}, ${next.createdAt}, NOW()
    ) ON CONFLICT(id) DO UPDATE SET
      name=EXCLUDED.name,
      category=EXCLUDED.category,
      address=EXCLUDED.address,
      phone=EXCLUDED.phone,
      email=EXCLUDED.email,
      website=EXCLUDED.website,
      maps_url=EXCLUDED.maps_url,
      rating=EXCLUDED.rating,
      user_rating_count=EXCLUDED.user_rating_count,
      lat=EXCLUDED.lat,
      lng=EXCLUDED.lng,
      score=EXCLUDED.score,
      status=EXCLUDED.status,
      notes=EXCLUDED.notes,
      offer_price=EXCLUDED.offer_price,
      package_name=EXCLUDED.package_name,
      next_follow_up=EXCLUDED.next_follow_up,
      last_contacted=EXCLUDED.last_contacted,
      source=EXCLUDED.source,
      updated_at=NOW()
    RETURNING id, name, category, address, phone, email, website, maps_url, rating, user_rating_count, lat, lng, score, status, notes, offer_price, package_name, next_follow_up, last_contacted, source, created_at::text, updated_at::text`;
    return fromDbLead((rows as any[])[0]);
  }

  const store = await ensureFileStore();
  const existingIndex = store.leads.findIndex((lead) => lead.id === next.id);
  if (existingIndex >= 0) store.leads[existingIndex] = { ...store.leads[existingIndex], ...next, createdAt: store.leads[existingIndex].createdAt, updatedAt: now };
  else store.leads.unshift({ ...next, createdAt: now, updatedAt: now });
  await writeFileStore(store);
  return existingIndex >= 0 ? store.leads[existingIndex] : store.leads[0];
}

export async function patchLead(id: string, patch: Partial<BusinessLead>) {
  const cleanId = cleanText(id, 180);
  if (!cleanId) throw new Error("missing lead id");

  const db = sql();
  if (db && await ensureBusinessSchema()) {
    const existing = await db`SELECT id, name, category, address, phone, email, website, maps_url, rating, user_rating_count, lat, lng, score, status, notes, offer_price, package_name, next_follow_up, last_contacted, source, created_at::text, updated_at::text FROM viewport_business_leads WHERE id=${cleanId} LIMIT 1`;
    if (!(existing as any[]).length) throw new Error("lead not found");
    const current = fromDbLead((existing as any[])[0]);
    const next = leadDefaults({ ...current, ...patch, id: current.id, name: current.name });

    const rows = await db`UPDATE viewport_business_leads SET
      category=${next.category},
      phone=${next.phone},
      email=${next.email},
      website=${next.website},
      score=${next.score},
      status=${next.status},
      notes=${next.notes},
      offer_price=${next.offerPrice},
      package_name=${next.packageName},
      next_follow_up=${next.nextFollowUp},
      last_contacted=${next.lastContacted},
      updated_at=NOW()
    WHERE id=${cleanId}
    RETURNING id, name, category, address, phone, email, website, maps_url, rating, user_rating_count, lat, lng, score, status, notes, offer_price, package_name, next_follow_up, last_contacted, source, created_at::text, updated_at::text`;
    return fromDbLead((rows as any[])[0]);
  }

  const store = await ensureFileStore();
  const idx = store.leads.findIndex((lead) => lead.id === cleanId);
  if (idx < 0) throw new Error("lead not found");

  const current = store.leads[idx];
  const next = leadDefaults({ ...current, ...patch, id: current.id, name: current.name, updatedAt: new Date().toISOString() });
  store.leads[idx] = next;
  await writeFileStore(store);
  return next;
}

export async function deleteLead(id: string) {
  const cleanId = cleanText(id, 180);
  if (!cleanId) throw new Error("missing lead id");

  const db = sql();
  if (db && await ensureBusinessSchema()) {
    const rows = await db`DELETE FROM viewport_business_leads WHERE id=${cleanId} RETURNING id`;
    return (rows as any[]).length > 0;
  }

  const store = await ensureFileStore();
  const before = store.leads.length;
  store.leads = store.leads.filter((lead) => lead.id !== cleanId);
  await writeFileStore(store);
  return before !== store.leads.length;
}
