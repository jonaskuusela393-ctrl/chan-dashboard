import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export type LeadStatus = "new" | "saved" | "contacted" | "interested" | "rejected" | "followup";

export type BusinessLead = {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  mapsUrl: string;
  rating: number | null;
  userRatingCount: number | null;
  lat: number;
  lng: number;
  score: number;
  status: LeadStatus;
  notes: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

type StoreShape = {
  leads: BusinessLead[];
};

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

async function ensureStore(): Promise<StoreShape> {
  await fs.mkdir(dataDir(), { recursive: true });

  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return { leads: Array.isArray(parsed.leads) ? parsed.leads : [] };
  } catch {
    const empty: StoreShape = { leads: [] };
    await fs.writeFile(storePath(), JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeStore(store: StoreShape) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2));
}

export async function listLeads() {
  const store = await ensureStore();
  return store.leads.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function upsertLead(input: Omit<BusinessLead, "createdAt" | "updatedAt"> & Partial<Pick<BusinessLead, "createdAt" | "updatedAt">>) {
  const store = await ensureStore();
  const now = new Date().toISOString();
  const existingIndex = store.leads.findIndex((lead) => lead.id === input.id);
  const next: BusinessLead = {
    id: cleanText(input.id, 180),
    name: cleanText(input.name, 180),
    category: cleanText(input.category, 120),
    address: cleanText(input.address, 260),
    phone: cleanText(input.phone, 80),
    website: cleanText(input.website, 260),
    mapsUrl: cleanText(input.mapsUrl, 320),
    rating: Number.isFinite(input.rating) ? Number(input.rating) : null,
    userRatingCount: Number.isFinite(input.userRatingCount) ? Number(input.userRatingCount) : null,
    lat: Number.isFinite(input.lat) ? Number(input.lat) : 0,
    lng: Number.isFinite(input.lng) ? Number(input.lng) : 0,
    score: Math.max(0, Math.min(Number(input.score) || 0, 100)),
    status: input.status || "saved",
    notes: cleanText(input.notes, 2000),
    source: cleanText(input.source, 80) || "manual",
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) store.leads[existingIndex] = { ...store.leads[existingIndex], ...next, createdAt: store.leads[existingIndex].createdAt };
  else store.leads.unshift(next);

  await writeStore(store);
  return next;
}

export async function patchLead(id: string, patch: Partial<Pick<BusinessLead, "status" | "notes" | "phone" | "website" | "category" | "score">>) {
  const store = await ensureStore();
  const idx = store.leads.findIndex((lead) => lead.id === id);
  if (idx < 0) throw new Error("lead not found");

  const allowedStatus = new Set(["new", "saved", "contacted", "interested", "rejected", "followup"]);
  const current = store.leads[idx];
  const next: BusinessLead = {
    ...current,
    status: patch.status && allowedStatus.has(patch.status) ? patch.status : current.status,
    notes: patch.notes === undefined ? current.notes : cleanText(patch.notes, 2000),
    phone: patch.phone === undefined ? current.phone : cleanText(patch.phone, 80),
    website: patch.website === undefined ? current.website : cleanText(patch.website, 260),
    category: patch.category === undefined ? current.category : cleanText(patch.category, 120),
    score: patch.score === undefined ? current.score : Math.max(0, Math.min(Number(patch.score) || 0, 100)),
    updatedAt: new Date().toISOString(),
  };

  store.leads[idx] = next;
  await writeStore(store);
  return next;
}

export async function deleteLead(id: string) {
  const store = await ensureStore();
  const before = store.leads.length;
  store.leads = store.leads.filter((lead) => lead.id !== id);
  await writeStore(store);
  return before !== store.leads.length;
}
